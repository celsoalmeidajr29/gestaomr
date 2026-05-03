<?php
/**
 * POST /api/auth/login.php
 *
 * Body JSON: { "email": "...", "senha": "..." }
 *
 * Sucesso 200: { ok: true, data: { usuario, perfil, csrf_token } }
 * Falha 401:   { ok: false, error: "Credenciais inválidas" }
 * Bloqueio 423: { ok: false, error: "Conta bloqueada por X minutos" }
 *
 * Lockout: após LOGIN_MAX_ATTEMPTS (5) falhas, bloqueia LOGIN_LOCKOUT_MINUTES (15) min.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$body = json_input();
$email = strtolower(trim((string) ($body['email'] ?? '')));
$senha = (string) ($body['senha'] ?? '');

if ($email === '' || $senha === '') {
    json_error('E-mail e senha são obrigatórios', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('E-mail em formato inválido', 422);
}

$pdo = db();

$stmt = $pdo->prepare(
    'SELECT id, nome, email, senha_hash, perfil_id, status, tentativas_login, bloqueado_ate
       FROM usuarios
      WHERE email = :email
      LIMIT 1'
);
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

// Mesma mensagem para "usuário não existe" e "senha errada" (não vazar enumeração)
if (!$user) {
    json_error('Credenciais inválidas', 401);
}

if ($user['status'] === 'BLOQUEADO') {
    json_error('Usuário bloqueado. Procure o administrador.', 403);
}
if ($user['status'] === 'INATIVO') {
    json_error('Usuário inativo', 403);
}

// Lockout temporário ativo?
if (!empty($user['bloqueado_ate'])) {
    $ate = strtotime((string) $user['bloqueado_ate']);
    if ($ate !== false && $ate > time()) {
        $mins = (int) ceil(($ate - time()) / 60);
        json_error("Conta temporariamente bloqueada. Tente novamente em {$mins} minuto(s).", 423);
    }
}

$max_attempts = env_int('LOGIN_MAX_ATTEMPTS', 5);
$lockout_minutes = env_int('LOGIN_LOCKOUT_MINUTES', 15);

if (!password_verify($senha, (string) $user['senha_hash'])) {
    $tentativas = (int) $user['tentativas_login'] + 1;
    if ($tentativas >= $max_attempts) {
        $bloqueado_ate = (new DateTimeImmutable("+{$lockout_minutes} minutes"))->format('Y-m-d H:i:s');
        $upd = $pdo->prepare(
            'UPDATE usuarios
                SET tentativas_login = :t, bloqueado_ate = :b
              WHERE id = :id'
        );
        $upd->execute([':t' => $tentativas, ':b' => $bloqueado_ate, ':id' => $user['id']]);
        json_error("Muitas tentativas. Conta bloqueada por {$lockout_minutes} minutos.", 423);
    }
    $upd = $pdo->prepare('UPDATE usuarios SET tentativas_login = :t WHERE id = :id');
    $upd->execute([':t' => $tentativas, ':id' => $user['id']]);
    json_error('Credenciais inválidas', 401);
}

// Login OK — limpa tentativas, atualiza ultimo_login
$pdo->prepare(
    'UPDATE usuarios
        SET tentativas_login = 0, bloqueado_ate = NULL, ultimo_login = NOW()
      WHERE id = :id'
)->execute([':id' => $user['id']]);

// Re-gera ID da sessão para evitar fixation
bootstrap_session();
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['_last_activity'] = time();

// Registra sessão na tabela `sessoes` (tracking opcional)
$lifetime_seconds = env_int('SESSION_LIFETIME', 480) * 60;
$expira_em = (new DateTimeImmutable("+{$lifetime_seconds} seconds"))->format('Y-m-d H:i:s');

$ins = $pdo->prepare(
    'INSERT INTO sessoes (id, usuario_id, ip, user_agent, expira_em)
     VALUES (:id, :uid, :ip, :ua, :exp)
     ON DUPLICATE KEY UPDATE
       usuario_id = VALUES(usuario_id),
       ip = VALUES(ip),
       user_agent = VALUES(user_agent),
       expira_em = VALUES(expira_em),
       ultima_atividade = CURRENT_TIMESTAMP'
);
$ins->execute([
    ':id' => session_id(),
    ':uid' => $user['id'],
    ':ip' => client_ip(),
    ':ua' => client_ua(),
    ':exp' => $expira_em,
]);

// Carrega perfil pra retornar permissões ao frontend
$pf = $pdo->prepare('SELECT id, codigo, nome, permissoes FROM perfis WHERE id = :id');
$pf->execute([':id' => $user['perfil_id']]);
$perfil = $pf->fetch();
if ($perfil) {
    $perfil['permissoes'] = json_decode((string) $perfil['permissoes'], true) ?: [];
}

json_response([
    'usuario' => [
        'id' => (int) $user['id'],
        'nome' => $user['nome'],
        'email' => $user['email'],
        'status' => $user['status'],
    ],
    'perfil' => $perfil,
    'csrf_token' => csrf_token(),
]);
