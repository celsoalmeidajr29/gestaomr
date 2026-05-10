<?php
/**
 * /api/propostas/aceitar.php — endpoint PÚBLICO (sem auth)
 *
 * POST { token: UUID, cnpj: string }
 *   - Valida token
 *   - Valida match de CNPJ (somente dígitos comparados)
 *   - Valida status ∈ {Enviada, Em análise} (não permite re-aceitar)
 *   - Marca status='Aceita', data_aceite=NOW(), grava IP+UA+CNPJ digitado, snapshot JSON imutável
 *   - Loga toda tentativa em proposta_aceites_log (sucessos e falhas)
 *
 * Resposta: { ok, data: { id, numero_formatado, status, data_aceite } }
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$d = json_input();
$token = trim((string) ($d['token'] ?? ''));
$cnpjDigitado = preg_replace('/\D/', '', (string) ($d['cnpj'] ?? ''));

if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $token)) {
    json_error('Token inválido', 400);
}
if (strlen($cnpjDigitado) !== 14) {
    json_error('CNPJ inválido', 422);
}

function log_aceite(?int $propostaId, string $token, ?string $cnpj, string $resultado): void
{
    $stmt = db()->prepare(
        'INSERT INTO proposta_aceites_log (proposta_id, token, cnpj_digitado, resultado, ip, user_agent)
         VALUES (:pid, :tok, :cnpj, :res, :ip, :ua)'
    );
    $stmt->execute([
        ':pid'  => $propostaId,
        ':tok'  => $token,
        ':cnpj' => $cnpj,
        ':res'  => $resultado,
        ':ip'   => client_ip(),
        ':ua'   => client_ua(),
    ]);
}

$stmt = db()->prepare(
    'SELECT id, numero, cliente_id, cliente_nome, cliente_cnpj,
            categoria, status, condicoes_comerciais, condicoes_faturamento,
            prazos, vencimento, observacoes, valor_total,
            token_expira_em
       FROM propostas
      WHERE token = :tok
      LIMIT 1'
);
$stmt->execute([':tok' => $token]);
$p = $stmt->fetch();

if (!$p) {
    log_aceite(null, $token, $cnpjDigitado, 'token_invalido');
    json_error('Token inválido', 404);
}

$propostaId = (int) $p['id'];

// Token expirado?
if ($p['token_expira_em'] && strtotime($p['token_expira_em']) < time()) {
    log_aceite($propostaId, $token, $cnpjDigitado, 'token_expirado');
    json_error('Link expirado', 410);
}

// Status válido para aceite?
if (!in_array($p['status'], ['Enviada', 'Em análise'], true)) {
    log_aceite($propostaId, $token, $cnpjDigitado, 'status_invalido');
    json_error('Proposta não está em estado de aceite', 409);
}

// CNPJ confere?
$cnpjGravado = preg_replace('/\D/', '', (string) $p['cliente_cnpj']);
if ($cnpjGravado !== $cnpjDigitado) {
    log_aceite($propostaId, $token, $cnpjDigitado, 'cnpj_invalido');
    json_error('CNPJ não confere', 403);
}

// Carrega itens para snapshot imutável
$itens = db()->prepare('SELECT * FROM proposta_itens WHERE proposta_id = :pid ORDER BY ordem ASC, id ASC');
$itens->execute([':pid' => $propostaId]);
$itensArr = $itens->fetchAll();

$snapshot = [
    'aceito_em' => date('c'),
    'cabecalho' => [
        'numero'                => (int) $p['numero'],
        'cliente_id'            => $p['cliente_id'],
        'cliente_nome'          => $p['cliente_nome'],
        'cliente_cnpj'          => $p['cliente_cnpj'],
        'categoria'             => $p['categoria'],
        'condicoes_comerciais'  => $p['condicoes_comerciais'],
        'condicoes_faturamento' => $p['condicoes_faturamento'],
        'prazos'                => $p['prazos'],
        'vencimento'            => $p['vencimento'],
        'observacoes'           => $p['observacoes'],
        'valor_total'           => $p['valor_total'],
    ],
    'itens'     => $itensArr,
    'aceite'    => [
        'cnpj_digitado' => $cnpjDigitado,
        'ip'            => client_ip(),
        'user_agent'    => client_ua(),
    ],
];

db()->beginTransaction();
try {
    $upd = db()->prepare(
        "UPDATE propostas SET
            status='Aceita',
            data_aceite=:da,
            ip_aceite=:ip,
            ua_aceite=:ua,
            cnpj_aceite=:cnpj,
            snapshot_aceito=CAST(:snap AS JSON)
          WHERE id=:id AND status IN ('Enviada','Em análise')"
    );
    $upd->execute([
        ':da'   => date('Y-m-d H:i:s'),
        ':ip'   => client_ip(),
        ':ua'   => client_ua(),
        ':cnpj' => $cnpjDigitado,
        ':snap' => json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':id'   => $propostaId,
    ]);

    if ($upd->rowCount() === 0) {
        db()->rollBack();
        log_aceite($propostaId, $token, $cnpjDigitado, 'status_invalido');
        json_error('Proposta não está em estado de aceite', 409);
    }

    log_aceite($propostaId, $token, $cnpjDigitado, 'aceito');
    db()->commit();
} catch (Throwable $e) {
    db()->rollBack();
    throw $e;
}

json_response([
    'id'                => $propostaId,
    'numero_formatado'  => 'P-' . str_pad((string) $p['numero'], 4, '0', STR_PAD_LEFT),
    'status'            => 'Aceita',
    'data_aceite'       => date('c'),
]);
