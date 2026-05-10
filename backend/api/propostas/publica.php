<?php
/**
 * /api/propostas/publica.php?token=UUID — endpoint PÚBLICO (sem auth)
 *
 * Retorna a proposta pelo token UUID. Usado pela página /proposta/:token
 * (cliente acessa pelo link enviado por e-mail).
 *
 * NÃO retorna campos sensíveis (criado_por, ip_aceite anteriores, etc).
 * Retorna 404 para token inválido/expirado para não vazar informação.
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

$token = trim((string) ($_GET['token'] ?? ''));
if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $token)) {
    json_error('Token inválido', 404);
}

$stmt = db()->prepare(
    "SELECT p.id, p.numero, CONCAT('P-', LPAD(p.numero, 4, '0')) AS numero_formatado,
            p.cliente_nome, p.cliente_cnpj,
            p.categoria, p.status,
            p.condicoes_comerciais, p.condicoes_faturamento,
            p.prazos, p.vencimento, p.observacoes,
            p.valor_total, p.token_expira_em, p.data_envio, p.data_aceite,
            c.razao_social AS cliente_razao
       FROM propostas p
  LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.token = :tok
      LIMIT 1"
);
$stmt->execute([':tok' => $token]);
$p = $stmt->fetch();

if (!$p) {
    // Log da tentativa inválida
    $log = db()->prepare(
        "INSERT INTO proposta_aceites_log (token, resultado, ip, user_agent)
         VALUES (:tok, 'token_invalido', :ip, :ua)"
    );
    $log->execute([':tok' => $token, ':ip' => client_ip(), ':ua' => client_ua()]);
    json_error('Proposta não encontrada', 404);
}

// Token expirado?
if ($p['token_expira_em'] && strtotime($p['token_expira_em']) < time()) {
    $log = db()->prepare(
        "INSERT INTO proposta_aceites_log (proposta_id, token, resultado, ip, user_agent)
         VALUES (:pid, :tok, 'token_expirado', :ip, :ua)"
    );
    $log->execute([
        ':pid' => $p['id'],
        ':tok' => $token,
        ':ip'  => client_ip(),
        ':ua'  => client_ua(),
    ]);
    json_error('Link expirado', 410);
}

// Itens (só campos relevantes pra exibição pública)
$itens = db()->prepare(
    'SELECT id, ordem, descricao, quantidade, valor_unitario, valor_total,
            efetivo, escala, template, categoria_servico
       FROM proposta_itens
      WHERE proposta_id = :pid
   ORDER BY ordem ASC, id ASC'
);
$itens->execute([':pid' => (int) $p['id']]);
$p['itens'] = $itens->fetchAll();

// Mascara o CNPJ retornado (cliente vai digitar pra confirmar — não devolvemos completo)
if (!empty($p['cliente_cnpj'])) {
    $cnpj = preg_replace('/\D/', '', (string) $p['cliente_cnpj']);
    if (strlen($cnpj) >= 8) {
        $p['cliente_cnpj_mascarado'] = substr($cnpj, 0, 2) . '.***.***/****-**';
    }
    unset($p['cliente_cnpj']);
}

json_response($p);
