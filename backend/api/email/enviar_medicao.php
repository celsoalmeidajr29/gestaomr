<?php
/**
 * MRSys — Enviar medição por email com PDF + XLSX em anexo
 *
 * Recebe JSON:
 *   { cliente, periodo, destinatarios:[], assunto, corpo, anexos:[{nome,mime,base64}] }
 *
 * Envia um email multipart/mixed via PHP mail() (ou SMTP relay configurado).
 * Remetente = email do usuário logado (require_auth).
 * Reply-To  = mesmo email do usuário logado.
 *
 * IMPORTANTE: Para que o servidor SMTP entregue o email com From=email-do-usuario,
 * é necessário que o servidor permita esse remetente (relay). Em hospedagens
 * compartilhadas como Hostinger, geralmente o `mail()` envia via servidor local
 * e o cabeçalho From deve corresponder a um endereço autenticado.
 *
 * Se o envio falhar, configure SMTP_HOST/PORT/USER/PASS no .env e ajuste
 * a função send_smtp() abaixo (esqueleto preparado para futura implementação).
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$user = require_auth();
$d = json_input();

// Validação
$cliente      = trim((string)($d['cliente']      ?? ''));
$periodo      = trim((string)($d['periodo']      ?? ''));
$fechamentoId = isset($d['fechamento_id']) ? (int)$d['fechamento_id'] : null;
$destinatarios = $d['destinatarios'] ?? [];
$assunto = trim((string)($d['assunto'] ?? ''));
$corpo = (string)($d['corpo'] ?? '');
$anexos = $d['anexos'] ?? [];

if (!$cliente || !$periodo) json_error('Cliente e período são obrigatórios', 422);
if (!is_array($destinatarios) || count($destinatarios) === 0) json_error('Adicione ao menos um destinatário', 422);
if (!$assunto) json_error('Assunto é obrigatório', 422);
if (!is_array($anexos)) json_error('Anexos inválidos', 422);

// Sanitiza destinatários
$destinatariosValidos = [];
foreach ($destinatarios as $e) {
    $e = trim((string)$e);
    if (filter_var($e, FILTER_VALIDATE_EMAIL)) {
        $destinatariosValidos[] = $e;
    }
}
if (count($destinatariosValidos) === 0) json_error('Nenhum destinatário válido', 422);

$remetente = $user['email'];
$nomeRemetente = $user['nome'] ?: 'MRSys';

// Monta o email MIME multipart/mixed
$boundary = '----=_MRSys_' . md5(uniqid('', true));
$headers = [
    "From: " . encode_header_name($nomeRemetente) . " <{$remetente}>",
    "Reply-To: <{$remetente}>",
    "MIME-Version: 1.0",
    "Content-Type: multipart/mixed; boundary=\"{$boundary}\"",
    "X-Mailer: MRSys/" . (env('APP_NAME', 'MRSys')),
];

// Corpo
$body  = "--{$boundary}\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= $corpo . "\r\n\r\n";

// Anexos
foreach ($anexos as $a) {
    $nome = (string)($a['nome'] ?? 'anexo');
    $mime = (string)($a['mime'] ?? 'application/octet-stream');
    $b64  = (string)($a['base64'] ?? '');
    if ($b64 === '') continue;
    // Re-quebra base64 em linhas de 76 chars (RFC 2045)
    $b64Wrapped = chunk_split($b64, 76, "\r\n");
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: {$mime}; name=\"{$nome}\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n";
    $body .= "Content-Disposition: attachment; filename=\"{$nome}\"\r\n\r\n";
    $body .= $b64Wrapped . "\r\n";
}
$body .= "--{$boundary}--\r\n";

// Envia para cada destinatário (separado para evitar bloqueio em massa)
$enviados = 0;
$erros = [];
$assuntoCodificado = encode_header_name($assunto);

foreach ($destinatariosValidos as $to) {
    $ok = @mail($to, $assuntoCodificado, $body, implode("\r\n", $headers), '-f' . $remetente);
    if ($ok) {
        $enviados++;
    } else {
        $erros[] = $to;
    }
}

// Registra em email_logs + atualiza enviado_em no fechamento
try {
    $statusLog = ($enviados > 0) ? 'ok' : 'erro';
    $db = db();
    $stmt = $db->prepare(
        'INSERT INTO email_logs (tipo, referencia_id, assunto, destinatarios, enviado_por, status, erros)
         VALUES (:tipo, :ref, :assunto, :dest, :uid, :status, :erros)'
    );
    $stmt->execute([
        ':tipo'   => 'medicao',
        ':ref'    => $fechamentoId,
        ':assunto'=> $assunto,
        ':dest'   => json_encode($destinatariosValidos, JSON_UNESCAPED_UNICODE),
        ':uid'    => $user['id'],
        ':status' => $statusLog,
        ':erros'  => count($erros) ? json_encode($erros, JSON_UNESCAPED_UNICODE) : null,
    ]);

    if ($enviados > 0 && $fechamentoId) {
        $db->prepare('UPDATE fechamentos SET enviado_em = NOW() WHERE id = :id')
           ->execute([':id' => $fechamentoId]);
    }

    // Auditoria legada
    $db->prepare(
        'INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois, ip, user_agent)
         VALUES (:uid, :acao, :ent, NULL, :dados, :ip, :ua)'
    )->execute([
        ':uid'  => $user['id'],
        ':acao' => 'EXPORT',
        ':ent'  => 'email_medicao',
        ':dados'=> json_encode([
            'cliente'       => $cliente,
            'periodo'       => $periodo,
            'destinatarios' => $destinatariosValidos,
            'enviados'      => $enviados,
            'erros'         => $erros,
        ], JSON_UNESCAPED_UNICODE),
        ':ip'   => client_ip(),
        ':ua'   => client_ua(),
    ]);
} catch (Throwable $_) {
    // nao bloqueia se log falhar
}

if ($enviados === 0) {
    json_error('Falha ao enviar email. Verifique a configuração SMTP do servidor.', 500, [
        'erros' => $erros,
    ]);
}

json_response([
    'enviados' => $enviados,
    'total' => count($destinatariosValidos),
    'erros' => $erros,
]);

// Codifica nome no header (RFC 2047) se tiver caracteres especiais
function encode_header_name(string $s): string
{
    if (preg_match('/[^\x20-\x7e]/', $s)) {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    }
    return $s;
}
