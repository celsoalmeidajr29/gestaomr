<?php
/**
 * GET /backend/api/cora/test_auth.php?empresa=MR_ASSESSORIA
 *
 * Sanity check da integração Cora — valida toda a cadeia:
 *   1. Variáveis de ambiente presentes
 *   2. Certificado e chave privada legíveis
 *   3. Construção do JWT (RS256)
 *   4. Token endpoint da Cora retorna access_token via mTLS
 *
 * NÃO realiza nenhuma operação financeira. Apenas autentica.
 *
 * Use durante setup ou para diagnosticar falhas de credencial.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_cora_client.php';

require_permission('despesas');

$empresa = strtoupper((string) ($_GET['empresa'] ?? ''));
$validas = ['MR_ASSESSORIA', 'UP_VIGILANCIA'];
if (!in_array($empresa, $validas, true)) {
    json_error('Parâmetro "empresa" inválido. Use: ' . implode(', ', $validas), 400);
}

$diag = [
    'empresa'        => $empresa,
    'env_ok'         => false,
    'cert_lido'      => false,
    'key_lido'       => false,
    'jwt_construido' => false,
    'token_obtido'   => false,
    'mensagens'      => [],
];

try {
    $cfg = cora_empresa_config($empresa);
    $diag['env_ok']    = true;
    $diag['cert_lido'] = is_readable($cfg['cert_path']);
    $diag['key_lido']  = is_readable($cfg['key_path']);
    $diag['mensagens'][] = "client_id={$cfg['client_id']}";
    $diag['mensagens'][] = "token_url={$cfg['token_url']}";
    $diag['mensagens'][] = "base_url={$cfg['base_url']}";
} catch (Throwable $e) {
    $diag['mensagens'][] = 'Configuração: ' . $e->getMessage();
    json_response(['ok' => false, 'data' => $diag], 200);
}

try {
    $jwt = cora_build_jwt($cfg);
    $diag['jwt_construido'] = true;
    $diag['mensagens'][] = 'JWT gerado (' . strlen($jwt) . ' chars)';
} catch (Throwable $e) {
    $diag['mensagens'][] = 'JWT: ' . $e->getMessage();
    json_response(['ok' => false, 'data' => $diag], 200);
}

try {
    $token = cora_get_access_token($empresa, true); // forceRefresh para sempre testar
    $diag['token_obtido'] = true;
    $diag['mensagens'][] = "access_token obtido (expires_in={$token['expires_in']}s)";
    $diag['expires_at_iso'] = date('c', $token['expires_at']);
} catch (Throwable $e) {
    $diag['mensagens'][] = 'Token: ' . $e->getMessage();
    json_response(['ok' => false, 'data' => $diag], 200);
}

json_response(['ok' => true, 'data' => $diag]);
