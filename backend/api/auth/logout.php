<?php
/**
 * POST /api/auth/logout.php
 *
 * Encerra a sessão atual: remove da tabela `sessoes`, limpa $_SESSION,
 * deleta o cookie do navegador e destrói a sessão no servidor.
 *
 * Sucesso 200: { ok: true, data: { logged_out: true } }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

bootstrap_session();
$sid = session_id();

if ($sid !== '' && $sid !== false) {
    db()->prepare('DELETE FROM sessoes WHERE id = :id')->execute([':id' => $sid]);
}

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        [
            'expires' => time() - 42000,
            'path' => $params['path'] ?? '/',
            'domain' => $params['domain'] ?? '',
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => $params['samesite'] ?? 'Lax',
        ]
    );
}

session_destroy();

json_response(['logged_out' => true]);
