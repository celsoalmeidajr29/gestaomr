<?php
/**
 * POST /backend/api/cora/transferir.php
 *
 * Inicia transferências PIX via Cora a partir de folhas selecionadas no frontend.
 *
 * Body esperado:
 * {
 *   "empresa": "MR_ASSESSORIA" | "UP_VIGILANCIA",
 *   "folhas": [
 *     {
 *       "funcionario_id": 123,
 *       "funcionario_nome": "JOÃO DA SILVA",
 *       "competencia": "2026-04",
 *       "valor_liquido": 1234.56,
 *       "chave_pix": "12345678900",
 *       "tipo_pix": "CPF",
 *       "folha_id": null
 *     },
 *     ...
 *   ]
 * }
 *
 * Para cada folha:
 *   - Valida (PIX, valor > 0, idempotência)
 *   - Insere em transferencias_cora
 *   - Chama API Cora PIX (mTLS + Bearer + Idempotency-Key)
 *   - Atualiza status conforme resposta
 *   - Retorna resultado por folha
 *
 * Idempotência: chave única por (folha + empresa). Reenvio é bloqueado.
 *
 * IMPORTANTE: aprovação manual no app Cora é exigida — após este endpoint
 * a transferência fica "aguardando_aprovacao" e só vira "concluida" via webhook.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_cora_client.php';

require_permission('despesas');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$d = json_input();
$empresa = strtoupper((string) ($d['empresa'] ?? ''));
if (!in_array($empresa, ['MR_ASSESSORIA', 'UP_VIGILANCIA'], true)) {
    json_error('Campo "empresa" obrigatório (MR_ASSESSORIA | UP_VIGILANCIA)', 422);
}
if (empty($d['folhas']) || !is_array($d['folhas'])) {
    json_error('Campo "folhas" obrigatório (array)', 422);
}

$user = current_user();
$pdo  = db();

// Mapeia tipo_pix do frontend (PT-BR) para o esperado pela Cora (EN)
function mapear_tipo_pix(string $tipo): string
{
    $t = strtoupper($tipo);
    return match ($t) {
        'CPF'       => 'CPF',
        'CNPJ'      => 'CNPJ',
        'EMAIL', 'E-MAIL' => 'EMAIL',
        'TELEFONE', 'CELULAR', 'PHONE' => 'PHONE',
        'ALEATORIA', 'ALEATÓRIA', 'RANDOM' => 'RANDOM',
        default     => $t,
    };
}

// Inferência simples do tipo a partir da chave (fallback se frontend não mandar)
function inferir_tipo_pix(string $chave): string
{
    $c = preg_replace('/\D/', '', $chave);
    if (strlen((string) $c) === 11 && ctype_digit((string) $c)) return 'CPF';
    if (strlen((string) $c) === 14 && ctype_digit((string) $c)) return 'CNPJ';
    if (strlen((string) $c) >= 10 && strlen((string) $c) <= 13 && ctype_digit((string) $c)) return 'PHONE';
    if (filter_var($chave, FILTER_VALIDATE_EMAIL)) return 'EMAIL';
    return 'RANDOM';
}

$resultados = [];

foreach ($d['folhas'] as $i => $f) {
    $funcId  = (int) ($f['funcionario_id'] ?? 0);
    $funcNm  = trim((string) ($f['funcionario_nome'] ?? ''));
    $comp    = (string) ($f['competencia'] ?? '');
    $valor   = (float) ($f['valor_liquido'] ?? 0);
    $chave   = trim((string) ($f['chave_pix'] ?? ''));
    $tipoIn  = (string) ($f['tipo_pix'] ?? '');
    $folhaId = isset($f['folha_id']) ? ((int) $f['folha_id'] ?: null) : null;

    $linha = [
        'funcionario_id'    => $funcId,
        'funcionario_nome'  => $funcNm,
        'competencia'       => $comp,
        'valor_liquido'     => $valor,
        'status'            => 'erro',
        'mensagem'          => null,
        'cora_transfer_id'  => null,
        'transferencia_id'  => null,
    ];

    // Validações
    if ($funcNm === '' || $comp === '' || $valor <= 0 || $chave === '') {
        $linha['mensagem'] = 'Dados incompletos (nome/competência/valor/chave PIX)';
        $resultados[] = $linha;
        continue;
    }

    $tipoPix = $tipoIn !== '' ? mapear_tipo_pix($tipoIn) : inferir_tipo_pix($chave);
    $idempKey = sprintf('folha-%d-%s-%s', $funcId, $comp, strtolower($empresa));

    // Idempotência: bloqueia se já existe transferência ativa
    $stmt = $pdo->prepare(
        'SELECT id, status, cora_transfer_id
         FROM transferencias_cora
         WHERE idempotency_key = :k
         LIMIT 1'
    );
    $stmt->execute([':k' => $idempKey]);
    $existente = $stmt->fetch();
    if ($existente && in_array($existente['status'], ['enviada', 'aguardando_aprovacao', 'concluida'], true)) {
        $linha['status'] = 'duplicada';
        $linha['mensagem'] = "Transferência já existe (status: {$existente['status']})";
        $linha['transferencia_id'] = (int) $existente['id'];
        $linha['cora_transfer_id'] = $existente['cora_transfer_id'];
        $resultados[] = $linha;
        continue;
    }

    // Monta payload Cora — formato baseado em Cora Open Finance / API PIX padrão
    // ATENÇÃO: ajustar campos conforme doc oficial após confirmação no test_auth
    $valorCentavos = (int) round($valor * 100);
    $payloadCora = [
        'amount'             => $valorCentavos,
        'recipient_key'      => $chave,
        'recipient_key_type' => $tipoPix,
        'description'        => "Folha {$comp} — {$funcNm}",
    ];

    // Insere registro inicial (status='enviada')
    $insertSql = 'INSERT INTO transferencias_cora
        (folha_id, funcionario_id, funcionario_nome, competencia, empresa,
         valor_liquido, chave_pix, tipo_pix, idempotency_key,
         status, request_payload, criado_por)
         VALUES (:folha_id, :func_id, :func_nm, :comp, :empresa,
         :valor, :chave, :tipo, :idemp,
         :status, :req, :uid)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           request_payload = VALUES(request_payload),
           atualizado_em = CURRENT_TIMESTAMP';
    $pdo->prepare($insertSql)->execute([
        ':folha_id' => $folhaId,
        ':func_id'  => $funcId ?: null,
        ':func_nm'  => $funcNm,
        ':comp'     => $comp,
        ':empresa'  => $empresa,
        ':valor'    => $valor,
        ':chave'    => $chave,
        ':tipo'     => $tipoPix,
        ':idemp'    => $idempKey,
        ':status'   => 'enviada',
        ':req'      => json_encode($payloadCora, JSON_UNESCAPED_UNICODE),
        ':uid'      => $user['id'],
    ]);
    $transfId = (int) ($pdo->lastInsertId() ?: $existente['id'] ?? 0);
    $linha['transferencia_id'] = $transfId;

    // Chama Cora
    try {
        $resp = cora_request(
            $empresa,
            'POST',
            '/payments/pix-payment/' . urlencode($idempKey),
            $payloadCora
        );
        $coraId = $resp['body']['id'] ?? $resp['body']['transferId'] ?? $resp['body']['transfer_id'] ?? null;
        $http   = $resp['http_code'];

        if ($http >= 200 && $http < 300) {
            $novoStatus = 'aguardando_aprovacao';
            $linha['status'] = 'enviada';
            $linha['mensagem'] = 'Aguardando aprovação no app Cora';
            $linha['cora_transfer_id'] = $coraId;

            $pdo->prepare(
                'UPDATE transferencias_cora
                 SET status=:st, cora_transfer_id=:cid, response_payload=:resp
                 WHERE id=:id'
            )->execute([
                ':st'   => $novoStatus,
                ':cid'  => $coraId ? substr((string) $coraId, 0, 100) : null,
                ':resp' => json_encode($resp['body'], JSON_UNESCAPED_UNICODE),
                ':id'   => $transfId,
            ]);

            // Atualiza folhas (upsert)
            if ($funcId > 0) {
                $pdo->prepare(
                    "INSERT INTO folhas (funcionario_id, competencia, status, liquido)
                     VALUES (:fid, :comp, 'transferido', :liq)
                     ON DUPLICATE KEY UPDATE status='transferido'"
                )->execute([':fid' => $funcId, ':comp' => $comp, ':liq' => $valor]);
            }
        } else {
            $msg = $resp['body']['error_description'] ?? $resp['body']['message'] ?? $resp['body']['error'] ?? "HTTP {$http}";
            $linha['status'] = 'erro';
            $linha['mensagem'] = is_string($msg) ? $msg : json_encode($msg);
            $pdo->prepare(
                'UPDATE transferencias_cora
                 SET status=:st, response_payload=:resp, erro_mensagem=:err
                 WHERE id=:id'
            )->execute([
                ':st'   => 'erro',
                ':resp' => json_encode($resp['body'], JSON_UNESCAPED_UNICODE),
                ':err'  => substr((string) $linha['mensagem'], 0, 500),
                ':id'   => $transfId,
            ]);
        }
    } catch (Throwable $e) {
        $linha['mensagem'] = 'Falha de rede/auth: ' . $e->getMessage();
        $pdo->prepare(
            'UPDATE transferencias_cora
             SET status=:st, erro_mensagem=:err
             WHERE id=:id'
        )->execute([
            ':st'  => 'erro',
            ':err' => substr($e->getMessage(), 0, 500),
            ':id'  => $transfId,
        ]);
    }

    $resultados[] = $linha;
}

$resumo = [
    'total'      => count($resultados),
    'enviadas'   => count(array_filter($resultados, fn ($r) => $r['status'] === 'enviada')),
    'duplicadas' => count(array_filter($resultados, fn ($r) => $r['status'] === 'duplicada')),
    'erros'      => count(array_filter($resultados, fn ($r) => $r['status'] === 'erro')),
];

json_response(['empresa' => $empresa, 'resumo' => $resumo, 'resultados' => $resultados]);
