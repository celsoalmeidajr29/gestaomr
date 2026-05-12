<?php
/**
 * Verifica se o usuário atual tem tokens Google válidos.
 * GET → { "connected": bool, "needs_refresh": bool }
 * DELETE → desconecta (revoga e apaga token)
 */

declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';
require_once __DIR__ . '/../_google.php';

$u      = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $token = google_load_token((int) $u['id']);
    if (!$token) {
        json_response(['connected' => false]);
    }
    $expired = (int) $token['expires_at'] < time() + 60;
    $canRefresh = !empty($token['refresh_token']);
    json_response([
        'connected'      => true,
        'needs_refresh'  => $expired && !$canRefresh,
    ]);
}

if ($method === 'DELETE') {
    $token = google_load_token((int) $u['id']);
    if ($token) {
        // Tenta revogar no Google (falha silenciosa se token já inválido)
        google_revoke($token['access_token']);
        google_delete_token((int) $u['id']);
    }
    json_response(['disconnected' => true]);
}

json_error('Método não permitido', 405);
