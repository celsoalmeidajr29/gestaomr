<?php
// Diagnóstico temporário — mostra a redirect_uri que o PHP está usando
// APAGAR após resolver o problema
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';
require_auth();

require_once __DIR__ . '/../_google.php';

$redirectUri = env('GOOGLE_REDIRECT_URI') ?: rtrim((string) env('APP_URL', 'https://celso.cloud'), '/') . '/api/cerebro/auth/callback.php';
$clientId    = env('GOOGLE_CLIENT_ID', '(não configurado)');

json_response([
    'redirect_uri_env'   => env('GOOGLE_REDIRECT_URI', '(não definido)'),
    'redirect_uri_efetiva' => $redirectUri,
    'app_url'            => env('APP_URL', '(não definido)'),
    'client_id_presente' => !empty(env('GOOGLE_CLIENT_ID')),
    'secret_presente'    => !empty(env('GOOGLE_CLIENT_SECRET')),
    'url_gerada'         => google_auth_url(),
]);
