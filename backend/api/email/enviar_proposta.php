<?php
/**
 * MRSys — Enviar proposta comercial por e-mail (link público de aceite)
 *
 * Recebe JSON:
 *   { proposta_id: int, destinatarios?: [string], corpo_extra?: string }
 *
 * Fluxo:
 *   1) Carrega proposta. Recusa se status='Aceita' ou 'Rejeitada'.
 *   2) Se token ainda não existe, gera UUID + 30d expiração e marca status='Enviada'.
 *   3) Monta link público: APP_URL + /proposta/{token}
 *   4) Envia e-mail HTML com o link para cliente_email (e/ou destinatários extras).
 *   5) Auditoria.
 *
 * Auth: requer permissão 'propostas'.
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('propostas');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$user = current_user();
$d    = json_input();

$propostaId = (int) ($d['proposta_id'] ?? 0);
if (!$propostaId) json_error('proposta_id obrigatório', 422);

$destinatariosExtras = is_array($d['destinatarios'] ?? null) ? $d['destinatarios'] : [];
$corpoExtra          = trim((string) ($d['corpo_extra'] ?? ''));

/* ----------------------------------------------------------------------
 * 1. Carrega proposta
 * --------------------------------------------------------------------- */
$stmt = db()->prepare(
    "SELECT p.*, CONCAT('P-', LPAD(p.numero, 4, '0')) AS numero_formatado,
            c.razao_social AS cliente_razao
       FROM propostas p
  LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = :id
      LIMIT 1"
);
$stmt->execute([':id' => $propostaId]);
$p = $stmt->fetch();
if (!$p) json_error('Proposta não encontrada', 404);

if (in_array($p['status'], ['Aceita', 'Rejeitada'], true)) {
    json_error("Proposta já está em '{$p['status']}' e não pode ser reenviada", 409);
}

/* ----------------------------------------------------------------------
 * 2. Garante token + atualiza status
 * --------------------------------------------------------------------- */
function uuid_v4_proposta(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

$token       = $p['token'];
$tokenExpira = $p['token_expira_em'];
$dataEnvio   = $p['data_envio'];

if (empty($token)) {
    $token       = uuid_v4_proposta();
    $tokenExpira = date('Y-m-d H:i:s', time() + 30 * 86400);
    $dataEnvio   = date('Y-m-d H:i:s');
}

$stmt = db()->prepare(
    "UPDATE propostas SET
        status          = CASE WHEN status='Criada' THEN 'Enviada' ELSE status END,
        token           = :tok,
        token_expira_em = :texp,
        data_envio      = COALESCE(data_envio, :denv)
      WHERE id = :id"
);
$stmt->execute([
    ':tok'  => $token,
    ':texp' => $tokenExpira,
    ':denv' => $dataEnvio,
    ':id'   => $propostaId,
]);

/* ----------------------------------------------------------------------
 * 3. Destinatários
 * --------------------------------------------------------------------- */
$lista = [];
if (!empty($p['cliente_email'])) {
    $lista[] = (string) $p['cliente_email'];
}
foreach ($destinatariosExtras as $e) {
    $lista[] = (string) $e;
}

$validos = [];
foreach ($lista as $e) {
    $e = trim((string) $e);
    if (filter_var($e, FILTER_VALIDATE_EMAIL) && !in_array($e, $validos, true)) {
        $validos[] = $e;
    }
}
if (empty($validos)) json_error('Nenhum destinatário válido (preencha cliente_email ou destinatarios[])', 422);

/* ----------------------------------------------------------------------
 * 4. Monta e envia o e-mail HTML
 * --------------------------------------------------------------------- */
$appUrl = rtrim((string) env('APP_URL', 'https://celso.cloud'), '/');
$link   = "{$appUrl}/proposta/{$token}";

$remetente     = $user['email'];
$nomeRemetente = $user['nome'] ?: 'MRSys';

$cliente   = (string) ($p['cliente_razao'] ?? $p['cliente_nome'] ?? 'Cliente');
$numero    = (string) $p['numero_formatado'];
$valor     = number_format((float) $p['valor_total'], 2, ',', '.');
$validade  = $tokenExpira ? date('d/m/Y', strtotime($tokenExpira)) : '—';

$assunto = "Proposta Comercial {$numero} — Grupo MR";

$html  = "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;\">";
$html .= "<p>Prezado(a),</p>";
$html .= "<p>Encaminhamos a proposta comercial <strong>{$numero}</strong> para análise.</p>";
$html .= "<table cellpadding='6' cellspacing='0' style='border-collapse:collapse;border:1px solid #e5e7eb;margin:14px 0;'>";
$html .= "<tr><td style='background:#f3f4f6'><strong>Cliente</strong></td><td>" . htmlspecialchars($cliente, ENT_QUOTES, 'UTF-8') . "</td></tr>";
$html .= "<tr><td style='background:#f3f4f6'><strong>Categoria</strong></td><td>" . htmlspecialchars((string)$p['categoria'], ENT_QUOTES, 'UTF-8') . "</td></tr>";
$html .= "<tr><td style='background:#f3f4f6'><strong>Valor total</strong></td><td>R$ {$valor}</td></tr>";
$html .= "<tr><td style='background:#f3f4f6'><strong>Validade do link</strong></td><td>{$validade}</td></tr>";
$html .= "</table>";
if ($corpoExtra !== '') {
    $html .= "<p>" . nl2br(htmlspecialchars($corpoExtra, ENT_QUOTES, 'UTF-8')) . "</p>";
}
$html .= "<p>Para visualizar o documento completo e <strong>aceitar a proposta digitalmente</strong>, acesse o link abaixo:</p>";
$html .= "<p style='margin:18px 0'><a href=\"{$link}\" style='background:#1E3A8A;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block'>Visualizar e aceitar proposta</a></p>";
$html .= "<p style='color:#6b7280;font-size:13px'>Caso o botão não funcione, copie e cole no navegador:<br/><a href=\"{$link}\">{$link}</a></p>";
$html .= "<p style='color:#6b7280;font-size:13px'>O aceite digital é validado pelo CNPJ informado no formulário e ficará registrado com data, horário e IP de acesso.</p>";
$html .= "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0' />";
$html .= "<p style='color:#6b7280;font-size:12px'>Atenciosamente,<br/>" . htmlspecialchars($nomeRemetente, ENT_QUOTES, 'UTF-8') . "<br/>Grupo MR — Segurança e Escolta Armada</p>";
$html .= "</body></html>";

function encode_subject_proposta(string $s): string
{
    if (preg_match('/[^\x20-\x7e]/', $s)) {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    }
    return $s;
}

$boundary = '----=_Proposta_' . md5(uniqid('', true));
$headers = [
    "From: " . encode_subject_proposta($nomeRemetente) . " <{$remetente}>",
    "Reply-To: <{$remetente}>",
    "MIME-Version: 1.0",
    "Content-Type: multipart/alternative; boundary=\"{$boundary}\"",
    "X-Mailer: MRSys-Propostas",
];

// Versão texto + HTML (multipart/alternative)
$textPlain  = "Prezado(a),\r\n\r\n";
$textPlain .= "Encaminhamos a proposta comercial {$numero} para análise.\r\n\r\n";
$textPlain .= "Cliente: {$cliente}\r\n";
$textPlain .= "Categoria: {$p['categoria']}\r\n";
$textPlain .= "Valor total: R$ {$valor}\r\n";
$textPlain .= "Validade do link: {$validade}\r\n\r\n";
if ($corpoExtra !== '') $textPlain .= $corpoExtra . "\r\n\r\n";
$textPlain .= "Para visualizar e aceitar a proposta, acesse:\r\n{$link}\r\n\r\n";
$textPlain .= "Atenciosamente,\r\n{$nomeRemetente}\r\nGrupo MR\r\n";

$body  = "--{$boundary}\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= $textPlain . "\r\n\r\n";
$body .= "--{$boundary}\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= $html . "\r\n\r\n";
$body .= "--{$boundary}--\r\n";

$enviados = 0;
$erros    = [];
$assuntoCodificado = encode_subject_proposta($assunto);
foreach ($validos as $to) {
    $ok = @mail($to, $assuntoCodificado, $body, implode("\r\n", $headers), '-f' . $remetente);
    if ($ok) $enviados++; else $erros[] = $to;
}

/* ----------------------------------------------------------------------
 * 5. Auditoria (best-effort)
 * --------------------------------------------------------------------- */
try {
    $stmt = db()->prepare(
        'INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois, ip, user_agent)
         VALUES (:uid, :acao, :ent, :eid, :dados, :ip, :ua)'
    );
    $stmt->execute([
        ':uid'   => $user['id'],
        ':acao'  => 'EXPORT',
        ':ent'   => 'proposta_envio',
        ':eid'   => $propostaId,
        ':dados' => json_encode([
            'numero_formatado' => $numero,
            'destinatarios'    => $validos,
            'enviados'         => $enviados,
            'erros'            => $erros,
            'token_gerado'     => empty($p['token']),
        ], JSON_UNESCAPED_UNICODE),
        ':ip'    => client_ip(),
        ':ua'    => client_ua(),
    ]);
} catch (Throwable $_) { /* não bloqueia */ }

if ($enviados === 0) {
    json_error('Falha ao enviar e-mail. Verifique a configuração SMTP do servidor.', 500, [
        'erros' => $erros,
        'token' => $token,
        'link'  => $link,
    ]);
}

json_response([
    'proposta_id'      => $propostaId,
    'numero_formatado' => $numero,
    'token'            => $token,
    'link'             => $link,
    'enviados'         => $enviados,
    'total'            => count($validos),
    'erros'            => $erros,
]);
