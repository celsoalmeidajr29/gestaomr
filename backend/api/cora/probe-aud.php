<?php
/**
 * GET /api/cora/probe-aud.php?empresa=UP_VIGILANCIA
 *
 * Testa diferentes valores de `aud` no JWT Client Assertion para descobrir
 * qual a Cora aceita. Útil quando token endpoint retorna invalid_client
 * sem error_description.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_cora_client.php';

require_permission('despesas');

header('Content-Type: text/plain; charset=utf-8');

$empresa = strtoupper((string) ($_GET['empresa'] ?? 'UP_VIGILANCIA'));
$cfg = cora_empresa_config($empresa);

$tokenUrl = $cfg['token_url']; // https://matls-clients.api.stage.cora.com.br/token
$host     = parse_url($tokenUrl, PHP_URL_SCHEME) . '://' . parse_url($tokenUrl, PHP_URL_HOST);

$candidatosAud = [
    $tokenUrl,                                          // exato (atual)
    $host,                                              // só host (sem path)
    $host . '/',                                        // host + barra
    'https://matls-clients.api.cora.com.br/token',      // URL prod (alguns servers usam só prod no aud)
    'https://matls-clients.api.cora.com.br',            // host prod
    'cora.com.br',                                      // domínio raiz
    'https://api.cora.com.br',                          // host api raiz
];

echo "=== PROBE DE AUDIENCE (aud) DO JWT ===\n";
echo "Empresa: {$empresa}\n";
echo "Client ID: {$cfg['client_id']}\n";
echo "Token URL: {$tokenUrl}\n\n";

foreach ($candidatosAud as $aud) {
    echo "─────────────────────────────────────────────\n";
    echo "Testando aud = {$aud}\n";

    // Constrói JWT com este aud
    $now     = time();
    $header  = ['alg' => 'RS256', 'typ' => 'JWT'];
    $payload = [
        'iss' => $cfg['client_id'],
        'sub' => $cfg['client_id'],
        'aud' => $aud,
        'iat' => $now,
        'exp' => $now + 300,
        'jti' => bin2hex(random_bytes(16)),
    ];

    $b64u = fn ($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    $signingInput = $b64u(json_encode($header)) . '.' . $b64u(json_encode($payload));
    $key = openssl_pkey_get_private('file://' . $cfg['key_path']);
    $signature = '';
    openssl_sign($signingInput, $signature, $key, OPENSSL_ALGO_SHA256);
    $jwt = $signingInput . '.' . $b64u($signature);

    $body = http_build_query([
        'grant_type'            => 'client_credentials',
        'client_id'             => $cfg['client_id'],
        'client_assertion_type' => 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        'client_assertion'      => $jwt,
    ]);

    $ch = curl_init($tokenUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
        CURLOPT_SSLCERT        => $cfg['cert_path'],
        CURLOPT_SSLKEY         => $cfg['key_path'],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    echo "  HTTP {$http}";
    if ($err) echo " (erro: {$err})";
    echo "\n";
    echo "  Body: " . substr((string) $resp, 0, 250) . "\n";

    // Sucesso?
    $json = json_decode((string) $resp, true);
    if ($http >= 200 && $http < 300 && isset($json['access_token'])) {
        echo "\n  ✓✓✓ SUCESSO! Use este aud no .env / código:\n";
        echo "      aud = {$aud}\n";
        echo "      access_token preview: " . substr($json['access_token'], 0, 30) . "...\n";
    }
    echo "\n";
}

echo "=== CONCLUSÃO ===\n";
echo "Se TODOS retornaram invalid_client, o problema NÃO é o aud.\n";
echo "Verifique no painel Cora:\n";
echo "  • Status do aplicativo/integração (deve estar ATIVO, não 'pendente')\n";
echo "  • Certificado registrado bate com o que está aqui:\n";
echo "      Serial: 31BECE1E00E7A6F85E056EA05CD1DF043F15004B (UP)\n";
echo "  • Pode haver um campo 'scopes' obrigatório que não estamos enviando\n";
echo "  • Suporte da Cora pode ver request_id no log deles e dizer o motivo\n";
