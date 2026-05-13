<?php
/**
 * Inicia o fluxo OAuth2 Google.
 * Retorna JSON { "url": "https://accounts.google.com/..." }
 * O frontend abre a URL em popup.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';
require_once __DIR__ . '/../_google.php';

require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

if (empty(env('GOOGLE_CLIENT_ID'))) {
    json_error('GOOGLE_CLIENT_ID não configurado no .env', 503);
}

$slot = (int) ($_GET['slot'] ?? 0);
if ($slot < 0 || $slot > 1) $slot = 0;
json_response(['url' => google_auth_url($slot)]);
