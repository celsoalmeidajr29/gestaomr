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

// --------------------------------------------------------------------------
// 3) Construção do JWT
// --------------------------------------------------------------------------
echo "\n[3/4] Construindo JWT (RS256)...\n";
try {
    $jwt = cora_build_jwt($cfg);
    echo "  ✓ JWT gerado (" . strlen($jwt) . " chars)\n";
    echo "  preview: " . substr($jwt, 0, 60) . "...\n";
} catch (Throwable $e) {
    echo "  ✗ FALHA: " . $e->getMessage() . "\n";
    echo "\nCorreção sugerida: chave privada inválida ou corrompida.\n";
    exit;
}

// --------------------------------------------------------------------------
// 4) Token endpoint Cora — autenticação mTLS + JWT
// --------------------------------------------------------------------------
echo "\n[4/4] Solicitando access_token na Cora (mTLS)...\n";
try {
    $token = cora_get_access_token($empresa, true); // forceRefresh
    echo "  ✓ access_token obtido!\n";
    echo "  token_type    = {$token['token_type']}\n";
    echo "  expires_in    = {$token['expires_in']}s\n";
    echo "  expires_at    = " . date('Y-m-d H:i:s', $token['expires_at']) . "\n";
    echo "  preview       = " . substr($token['access_token'], 0, 30) . "...\n";
} catch (Throwable $e) {
    echo "  ✗ FALHA: " . $e->getMessage() . "\n\n";
    echo "Causas comuns:\n";
    echo "  - URL de token_url errada (CORA_TOKEN_URL no .env)\n";
    echo "  - Certificado não corresponde ao Client ID\n";
    echo "  - Cora bloqueou IP do servidor\n";
    echo "  - Permissões do certificado errada (chmod 600)\n";
    exit;
}

echo "\n=== ✓ INTEGRAÇÃO PRONTA ===\n";
echo "Cora autentica com sucesso. Pode testar transferência real na aba Folha.\n";
