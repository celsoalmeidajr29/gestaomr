<?php
/**
 * GET /api/cora/probe-token-url.php
 *
 * Testa quais URLs candidatas do token endpoint Cora resolvem DNS
 * e respondem (sem fazer auth real — só verifica conectividade).
 *
 * Útil para descobrir qual é a URL correta de stage/prod sem ficar
 * editando .env tentativa por tentativa.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('despesas');

header('Content-Type: text/plain; charset=utf-8');

$candidatos = [
    'https://api.stage.cora.com.br/token',
    'https://api.stage.cora.com.br/oauth2/token',
    'https://api.stage.cora.com.br/v2/oauth2/token',
    'https://matls.stage.cora.com.br/token',
    'https://matls-clients.api.stage.cora.com.br/token',
    'https://matls-clients.api.stage.cora.com.br/oauth2/token',
    // Produção (não usar em stage, só pra contraste)
    'https://matls-clients.api.cora.com.br/token',
    'https://api.cora.com.br/token',
];

echo "=== PROBE DE URLs DO TOKEN ENDPOINT CORA ===\n\n";
echo "Testa DNS e conectividade HTTP (sem mTLS/auth).\n";
echo "Quem retornar 401/403 com JSON do Cora = está VIVO.\n";
echo "Quem retornar 'Could not resolve host' = não existe.\n\n";

foreach ($candidatos as $url) {
    echo "─────────────────────────────────────────────\n";
    echo "URL: {$url}\n";

    $host = parse_url($url, PHP_URL_HOST);
    $ip = $host ? @gethostbyname($host) : '';
    $dnsOk = $ip && $ip !== $host;
    echo "DNS: " . ($dnsOk ? "✓ resolveu para {$ip}" : "✗ não resolveu") . "\n";

    if (!$dnsOk) { echo "\n"; continue; }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_NOBODY         => false,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => 'grant_type=client_credentials',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        echo "HTTP: ✗ erro — {$err}\n";
    } else {
        echo "HTTP: {$http}\n";
        if (is_string($resp) && $resp !== '') {
            $preview = substr($resp, 0, 200);
            echo "Body preview: " . str_replace("\n", '\n', $preview) . "\n";
        }
    }
    echo "\n";
}

echo "=== INTERPRETAÇÃO ===\n";
echo "O endpoint correto vai responder algo do tipo:\n";
echo "  HTTP 400/401/403 com JSON {\"error\":\"invalid_client\"} ou similar.\n";
echo "Aí copia a URL e atualiza CORA_TOKEN_URL no .env.\n";
echo "\nSe TUDO falhar DNS, verifique com a Cora qual é a URL stage atualizada\n";
echo "(login no painel Cora → API/Desenvolvedores → endpoint OAuth).\n";
