<?php
/**
 * POST /backend/api/cora/webhook.php
 *
 * Endpoint público de recebimento de webhooks da Cora.
 *
 * F1 (este arquivo): apenas RECEBE, valida assinatura HMAC e loga em
 * cora_webhook_logs. NÃO atualiza status de transferência ainda.
 *
 * F3: este endpoint vai cruzar `cora_transfer_id` com `transferencias_cora`,
 * atualizar status da folha (transferido → pago / cancelada) e marcar
 * processado=1 no log.
 *
 * Headers esperados (segundo doc Cora):
 *   X-Cora-Signature: sha256=<hmac>      ← assinatura HMAC do body
 *   X-Cora-Empresa:   MR_ASSESSORIA       ← opcional, usado para identificar empresa
 *
 * Como a Cora identifica a empresa pode variar (path, header, payload).
 * Aqui tentamos identificar por: header → query string → payload (clientId).
 *
 * Sempre retorna 200 rápido, mesmo se inválido — Cora reentregue se demorar
 * ou se status >= 400. O log fica registrado para debug.
 */

declare(strict_types=1);

// IMPORTANTE: webhooks são públicos (sem sessão). NÃO chamar require_permission.
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_cora_client.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

$rawBody  = (string) file_get_contents('php://input');
$payload  = json_decode($rawBody, true);
$ipOrigem = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
if ($ipOrigem) {
    $ipOrigem = trim(explode(',', $ipOrigem)[0]);
}

// Identifica empresa: header > query > payload.client_id
$empresa = null;
$candidatos = [
    $_SERVER['HTTP_X_CORA_EMPRESA'] ?? null,
    $_GET['empresa'] ?? null,
];
foreach ($candidatos as $c) {
    if ($c && in_array(strtoupper((string) $c), ['MR_ASSESSORIA', 'UP_VIGILANCIA'], true)) {
        $empresa = strtoupper((string) $c);
        break;
    }
}
if ($empresa === null && is_array($payload)) {
    // tenta inferir pelo client_id no payload
    $clientIdPayload = $payload['client_id'] ?? $payload['clientId'] ?? null;
    if ($clientIdPayload === env('CORA_MR_CLIENT_ID')) $empresa = 'MR_ASSESSORIA';
    elseif ($clientIdPayload === env('CORA_UP_CLIENT_ID')) $empresa = 'UP_VIGILANCIA';
}

$signatureHeader = $_SERVER['HTTP_X_CORA_SIGNATURE'] ?? $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$sigValid = false;
$erroProc = null;

if ($empresa) {
    try {
        $sigValid = cora_validate_webhook_signature($empresa, $rawBody, $signatureHeader);
    } catch (Throwable $e) {
        $erroProc = 'Validação assinatura: ' . $e->getMessage();
    }
} else {
    $erroProc = 'Empresa não identificada no webhook';
}

$evento          = $payload['event'] ?? $payload['type'] ?? $payload['eventType'] ?? null;
$coraTransferId  = $payload['transfer_id'] ?? $payload['transferId'] ?? $payload['id'] ?? $payload['data']['id'] ?? null;

try {
    $stmt = db()->prepare(
        'INSERT INTO cora_webhook_logs
         (evento, empresa, cora_transfer_id, payload, signature_header, signature_valid, processado, erro_processamento, ip_origem)
         VALUES (:evento, :empresa, :cora_transfer_id, :payload, :sig_header, :sig_valid, 0, :erro, :ip)'
    );
    $stmt->execute([
        ':evento'           => $evento ? substr((string) $evento, 0, 80) : null,
        ':empresa'          => $empresa,
        ':cora_transfer_id' => $coraTransferId ? substr((string) $coraTransferId, 0, 100) : null,
        ':payload'          => $rawBody,
        ':sig_header'       => $signatureHeader ? substr($signatureHeader, 0, 255) : null,
        ':sig_valid'        => $sigValid ? 1 : 0,
        ':erro'             => $erroProc,
        ':ip'               => $ipOrigem ? substr($ipOrigem, 0, 45) : null,
    ]);
} catch (Throwable $e) {
    // Não deixa erro de DB derrubar a resposta — Cora reentregaria desnecessariamente
    error_log('[cora.webhook] Falha ao gravar log: ' . $e->getMessage());
}

// Resposta 200 mesmo se inválido — log é o que importa em F1
header('Content-Type: application/json');
echo json_encode([
    'ok'              => true,
    'received'        => true,
    'empresa'         => $empresa,
    'evento'          => $evento,
    'signature_valid' => $sigValid,
    'phase'           => 'F1-log-only',
]);
