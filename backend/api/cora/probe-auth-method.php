<?php
/**
 * GET /api/cora/probe-auth-method.php?empresa=UP_VIGILANCIA
 *
 * Testa diferentes métodos de client authentication contra o token endpoint:
 *   1. private_key_jwt + mTLS (atual)
 *   2. tls_client_auth puro (só client_id no body, mTLS faz a auth)
 *   3. tls_client_auth com scope
 *   4. private_key_jwt + scope
 *
 * Cora pode ter registrado a integração com auth method diferente do
 * private_key_jwt que estamos enviando.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_cora_client.php';

require_permission('despesas');

header('Content-Type: text/plain; charset=utf-8');

$empresa = strtoupper((string) ($_GET['empresa'] ?? 'UP_VIGILANCIA'));
$cfg = cora_empresa_config($empresa);

function probe_request(array $cfg, array $body, string $titulo): void
{
    echo "─────────────────────────────────────────────\n";
    echo "{$titulo}\n";
    echo "Body fields: " . implode(', ', array_keys($body)) . "\n";

    $ch = curl_init($cfg['token_url']);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($body),
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
    if ($err) echo " (err: {$err})";
    echo "\n  Body: " . substr((string) $resp, 0, 300) . "\n\n";
}

echo "=== PROBE DE MÉTODOS DE AUTH ===\n";
echo "Empresa: {$empresa}\n";
echo "Client ID: {$cfg['client_id']}\n";
echo "Token URL: {$cfg['token_url']}\n\n";

// Constrói JWT (será reaproveitado nos métodos com private_key_jwt)
$jwt = cora_build_jwt($cfg);

// Método 1: private_key_jwt (atual)
probe_request($cfg, [
    'grant_type'            => 'client_credentials',
    'client_id'             => $cfg['client_id'],
    'client_assertion_type' => 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    'client_assertion'      => $jwt,
], 'Método 1: private_key_jwt (cert + JWT) — atual');

// Método 2: tls_client_auth puro (só client_id, mTLS resolve auth)
probe_request($cfg, [
    'grant_type' => 'client_credentials',
    'client_id'  => $cfg['client_id'],
], 'Método 2: tls_client_auth (só client_id, sem JWT)');

// Método 3: tls_client_auth + scope comum
probe_request($cfg, [
    'grant_type' => 'client_credentials',
    'client_id'  => $cfg['client_id'],
    'scope'      => 'pix.write payments.write accounts.read',
], 'Método 3: tls_client_auth + scopes Cora (pix.write, payments.write, accounts.read)');

// Método 4: private_key_jwt + scope
probe_request($cfg, [
    'grant_type'            => 'client_credentials',
    'client_id'             => $cfg['client_id'],
    'client_assertion_type' => 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    'client_assertion'      => $jwt,
    'scope'                 => 'pix.write payments.write accounts.read',
], 'Método 4: private_key_jwt + scopes');

// Método 5: nada além de mTLS
probe_request($cfg, [
    'grant_type' => 'client_credentials',
], 'Método 5: só mTLS (sem nem o client_id no body)');

echo "=== CONCLUSÃO ===\n";
echo "Se algum retornar 200 com access_token → use esse método.\n";
echo "Se TODOS retornarem invalid_client → o problema NÃO é como você autentica:\n";
echo "  → integração não está ativada na Cora\n";
echo "  → ou o cert não está registrado lá no painel deles\n";
echo "  → abra chamado com a Cora informando:\n";
echo "      Client ID: {$cfg['client_id']}\n";
echo "      Cert Subject CN: int-5hkgOAMyBeJxYJoKTJ1rRC\n";
echo "      Erro: token endpoint retorna invalid_client em todas tentativas\n";
echo "      Eles podem buscar request_id no log deles e identificar o problema\n";
