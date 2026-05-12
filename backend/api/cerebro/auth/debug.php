<?php
// Diagnóstico temporário — mostra a redirect_uri que o PHP está usando
// APAGAR após resolver o problema
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';
require_auth();

$redirectUri = env('GOOGLE_REDIRECT_URI', '(não configurado)');
$clientId    = env('GOOGLE_CLIENT_ID', '(não configurado)');

json_response([
    'redirect_uri'       => $redirectUri,
    'client_id_presente' => !empty(env('GOOGLE_CLIENT_ID')),
    'secret_presente'    => !empty(env('GOOGLE_CLIENT_SECRET')),
    'url_gerada'         => 'https://accounts.google.com/o/oauth2/auth?redirect_uri=' . urlencode($redirectUri) . '&client_id=' . urlencode($clientId) . '&...',
]);
