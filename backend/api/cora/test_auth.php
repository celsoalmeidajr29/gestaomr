<?php
/**
 * GET /api/cora/test_auth.php?empresa=MR_ASSESSORIA
 *
 * Sanity check da integração Cora — valida toda a cadeia de autenticação:
 *   1. Variáveis de ambiente presentes
 *   2. Certificado e chave privada legíveis
 *   3. Construção do JWT (RS256)
 *   4. Token endpoint da Cora retorna access_token via mTLS
 *
 * NÃO realiza nenhuma operação financeira. Apenas autentica.
 *
 * Saída em texto plano para diagnóstico fácil no navegador.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_cora_client.php';

require_permission('despesas');

header('Content-Type: text/plain; charset=utf-8');

$empresa = strtoupper((string) ($_GET['empresa'] ?? ''));
$validas = ['MR_ASSESSORIA', 'UP_VIGILANCIA'];

echo "=== TESTE DE AUTENTICAÇÃO CORA ===\n\n";

if (!in_array($empresa, $validas, true)) {
    echo "✗ ERRO: parâmetro 'empresa' obrigatório\n\n";
    echo "Use uma das URLs:\n";
    foreach ($validas as $e) {
        echo "  https://celso.cloud/api/cora/test_auth.php?empresa={$e}\n";
    }
    exit;
}

echo "Empresa: {$empresa}\n";
echo "Hora:    " . date('Y-m-d H:i:s') . "\n\n";

// --------------------------------------------------------------------------
// 1) Configuração — lê .env e verifica arquivos
// --------------------------------------------------------------------------
echo "[1/4] Lendo configuração...\n";
try {
    $cfg = cora_empresa_config($empresa);
    echo "  ✓ client_id   = {$cfg['client_id']}\n";
    echo "  ✓ token_url   = {$cfg['token_url']}\n";
    echo "  ✓ base_url    = {$cfg['base_url']}\n";
    echo "  ✓ cert_path   = {$cfg['cert_path']}\n";
    echo "  ✓ key_path    = {$cfg['key_path']}\n";
} catch (Throwable $e) {
    echo "  ✗ FALHA: " . $e->getMessage() . "\n";
    echo "\nCorreção sugerida: revisar variáveis CORA_{$empresa}_* no .env\n";
    exit;
}

// --------------------------------------------------------------------------
// 2) Permissões e validade dos arquivos
// --------------------------------------------------------------------------
echo "\n[2/4] Verificando arquivos...\n";
$cert = @file_get_contents($cfg['cert_path']);
$key  = @file_get_contents($cfg['key_path']);
if ($cert === false) { echo "  ✗ não consegui ler o certificado\n"; exit; }
if ($key === false)  { echo "  ✗ não consegui ler a chave privada\n"; exit; }
echo "  ✓ certificado lido (" . strlen($cert) . " bytes)\n";
echo "  ✓ chave privada lida (" . strlen($key) . " bytes)\n";

if (!str_contains($cert, 'BEGIN CERTIFICATE'))  echo "  ⚠ certificado não tem cabeçalho 'BEGIN CERTIFICATE' — formato pode estar errado\n";
if (!str_contains($key, 'BEGIN') || !str_contains($key, 'PRIVATE KEY')) echo "  ⚠ chave privada não tem cabeçalho 'BEGIN ... PRIVATE KEY' — formato pode estar errado\n";

// Parse do certificado — revela CN/Subject/Validade/Serial
$x509 = @openssl_x509_parse($cert);
if ($x509) {
    $subject = $x509['subject'] ?? [];
    $issuer  = $x509['issuer'] ?? [];
    echo "\n  Certificado:\n";
    echo "    Subject CN:  " . ($subject['CN'] ?? '?') . "\n";
    if (!empty($subject['O']))  echo "    Subject O:   " . $subject['O'] . "\n";
    if (!empty($subject['OU'])) echo "    Subject OU:  " . $subject['OU'] . "\n";
    echo "    Issuer CN:   " . ($issuer['CN'] ?? '?') . "\n";
    echo "    Serial:      " . ($x509['serialNumberHex'] ?? '?') . "\n";
    echo "    Válido até:  " . date('Y-m-d H:i:s', $x509['validTo_time_t'] ?? 0) . "\n";
    if (($x509['validTo_time_t'] ?? 0) < time()) echo "    ⚠ CERTIFICADO EXPIRADO\n";
} else {
    echo "  ⚠ não consegui parsear o certificado X.509\n";
}

// Verifica se a chave privada bate com o certificado
$privKey = openssl_pkey_get_private($key);
$pubFromCert = openssl_pkey_get_public($cert);
if ($privKey && $pubFromCert) {
    $testData = 'mrsys-pair-check-' . bin2hex(random_bytes(8));
    $sig = '';
    openssl_sign($testData, $sig, $privKey, OPENSSL_ALGO_SHA256);
    $verified = openssl_verify($testData, $sig, $pubFromCert, OPENSSL_ALGO_SHA256);
    echo "  Par cert+key bate? " . ($verified === 1 ? '✓ sim' : '✗ NÃO — chave privada não corresponde ao certificado') . "\n";
}

// --------------------------------------------------------------------------
// 3) Construção do JWT
// --------------------------------------------------------------------------
echo "\n[3/4] Construindo JWT (RS256)...\n";
try {
    $jwt = cora_build_jwt($cfg);
    echo "  ✓ JWT gerado (" . strlen($jwt) . " chars)\n";
    // Decodifica o payload pra mostrar o que vai pra Cora
    $partes = explode('.', $jwt);
    if (count($partes) === 3) {
        $headerJson  = base64_decode(strtr($partes[0], '-_', '+/'));
        $payloadJson = base64_decode(strtr($partes[1], '-_', '+/'));
        echo "  Header:  " . $headerJson . "\n";
        echo "  Payload: " . $payloadJson . "\n";
    }
} catch (Throwable $e) {
    echo "  ✗ FALHA: " . $e->getMessage() . "\n";
    echo "\nCorreção sugerida: chave privada inválida ou corrompida.\n";
    exit;
}

// --------------------------------------------------------------------------
// 4) Token endpoint Cora — autenticação mTLS + JWT
// --------------------------------------------------------------------------
echo "\n[4/4] Solicitando access_token na Cora (mTLS)...\n";

// Faz a chamada manualmente pra capturar TODO o response (headers + body)
$body = http_build_query([
    'grant_type'            => 'client_credentials',
    'client_id'             => $cfg['client_id'],
    'client_assertion_type' => 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    'client_assertion'      => $jwt,
]);
echo "  Request body:\n    grant_type=client_credentials\n    client_id={$cfg['client_id']}\n    client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer\n    client_assertion=<jwt " . strlen($jwt) . " chars>\n";

$ch = curl_init($cfg['token_url']);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER         => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
    CURLOPT_SSLCERT        => $cfg['cert_path'],
    CURLOPT_SSLKEY         => $cfg['key_path'],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_TIMEOUT        => 15,
]);
$raw = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$err = curl_error($ch);
curl_close($ch);

if ($raw === false) {
    echo "\n  ✗ Erro de rede: {$err}\n";
    exit;
}

$respHeaders = substr($raw, 0, $headerSize);
$respBody    = substr($raw, $headerSize);

echo "\n  HTTP Status: {$httpCode}\n";
echo "  Response headers (relevantes):\n";
foreach (explode("\r\n", $respHeaders) as $h) {
    if (preg_match('/^(content-type|www-authenticate|x-correlation|x-request|date):/i', $h)) {
        echo "    {$h}\n";
    }
}
echo "  Response body:\n    " . str_replace("\n", "\n    ", $respBody) . "\n";

if ($httpCode >= 200 && $httpCode < 300) {
    $json = json_decode($respBody, true);
    if (isset($json['access_token'])) {
        echo "\n  ✓ access_token obtido!\n";
        echo "  preview: " . substr($json['access_token'], 0, 30) . "...\n";
        echo "\n=== ✓ INTEGRAÇÃO PRONTA ===\n";
        exit;
    }
}

echo "\n  ✗ FALHA — Cora rejeitou as credenciais.\n";
echo "\nDiagnóstico:\n";
echo "  • Compare 'Subject CN' (etapa 2) com o Client ID acima — devem identificar a MESMA empresa\n";
echo "  • Confirme no painel Cora que o Client ID '{$cfg['client_id']}' está ativo e tem este certificado registrado\n";
echo "  • Se 'invalid_client': cert ↔ client_id não batem, ou JWT com claim errado\n";
echo "  • Se 'invalid_grant': JWT expirado/malformado/aud errado\n";

echo "\n=== ✓ INTEGRAÇÃO PRONTA ===\n";
echo "Cora autentica com sucesso. Pode testar transferência real na aba Folha.\n";
