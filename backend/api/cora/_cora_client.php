<?php
/**
 * Cliente Cora (mTLS + JWT Client Assertion)
 *
 * Autenticação OAuth 2.0 client_credentials com JWT Client Assertion (RS256)
 * + mTLS (cert + key da empresa). Cada empresa tem credenciais isoladas.
 *
 * Uso:
 *   require_once __DIR__ . '/_cora_client.php';
 *   $token  = cora_get_access_token('MR_ASSESSORIA');
 *   $result = cora_request('MR_ASSESSORIA', 'POST', '/payments/pix-payment/IDEMP_KEY', [...]);
 *
 * Empresas suportadas: 'MR_ASSESSORIA', 'UP_VIGILANCIA'
 */

declare(strict_types=1);

if (!function_exists('env')) {
    require_once __DIR__ . '/../../_bootstrap.php';
}

// ----------------------------------------------------------------------------
// Configuração por empresa — lê do .env conforme prefixo
// ----------------------------------------------------------------------------

function cora_empresa_config(string $empresa): array
{
    $empresa = strtoupper($empresa);
    $prefix = match ($empresa) {
        'MR_ASSESSORIA' => 'CORA_MR',
        'UP_VIGILANCIA' => 'CORA_UP',
        default => throw new RuntimeException("Empresa Cora desconhecida: {$empresa}"),
    };

    $cfg = [
        'empresa'          => $empresa,
        'client_id'        => (string) env("{$prefix}_CLIENT_ID", ''),
        'cert_path'        => (string) env("{$prefix}_CERT_PATH", ''),
        'key_path'         => (string) env("{$prefix}_KEY_PATH", ''),
        'webhook_secret'   => (string) env("{$prefix}_WEBHOOK_SECRET", ''),
        'base_url'         => rtrim((string) env('CORA_BASE_URL', 'https://matls-clients.stage.cora.com.br'), '/'),
        'token_url'        => (string) env('CORA_TOKEN_URL', 'https://matls-clients.stage.cora.com.br/token'),
    ];

    foreach (['client_id', 'cert_path', 'key_path'] as $k) {
        if ($cfg[$k] === '') {
            throw new RuntimeException("Cora {$empresa}: variável {$k} não configurada no .env");
        }
    }
    foreach (['cert_path', 'key_path'] as $k) {
        if (!is_readable($cfg[$k])) {
            throw new RuntimeException("Cora {$empresa}: arquivo {$k} não encontrado/legível: {$cfg[$k]}");
        }
    }

    return $cfg;
}

// ----------------------------------------------------------------------------
// JWT Client Assertion (RS256)
// ----------------------------------------------------------------------------

function cora_b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function cora_build_jwt(array $cfg): string
{
    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $now    = time();
    $payload = [
        'iss' => $cfg['client_id'],
        'sub' => $cfg['client_id'],
        'aud' => $cfg['token_url'],
        'iat' => $now,
        'exp' => $now + 300,
        'jti' => bin2hex(random_bytes(16)),
    ];

    $segments = [
        cora_b64url(json_encode($header, JSON_UNESCAPED_SLASHES)),
        cora_b64url(json_encode($payload, JSON_UNESCAPED_SLASHES)),
    ];
    $signingInput = implode('.', $segments);

    $key = openssl_pkey_get_private('file://' . $cfg['key_path']);
    if ($key === false) {
        throw new RuntimeException("Cora {$cfg['empresa']}: falha ao abrir chave privada — " . openssl_error_string());
    }

    $signature = '';
    $ok = openssl_sign($signingInput, $signature, $key, OPENSSL_ALGO_SHA256);
    if (!$ok) {
        throw new RuntimeException("Cora {$cfg['empresa']}: falha ao assinar JWT — " . openssl_error_string());
    }

    return $signingInput . '.' . cora_b64url($signature);
}

// ----------------------------------------------------------------------------
// Cache simples de access_token em arquivo (TTL respeitado)
// ----------------------------------------------------------------------------

function cora_token_cache_path(string $empresa): string
{
    $dir = sys_get_temp_dir() . '/mrsys-cora';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir . '/token-' . strtolower($empresa) . '.json';
}

function cora_load_cached_token(string $empresa): ?array
{
    $path = cora_token_cache_path($empresa);
    if (!is_readable($path)) return null;
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data) || empty($data['access_token']) || empty($data['expires_at'])) return null;
    if ((int) $data['expires_at'] <= time() + 30) return null; // 30s de margem
    return $data;
}

function cora_save_cached_token(string $empresa, array $token): void
{
    $path = cora_token_cache_path($empresa);
    @file_put_contents($path, json_encode($token));
    @chmod($path, 0600);
}

// ----------------------------------------------------------------------------
// Obtenção do access_token (com cache)
// ----------------------------------------------------------------------------

function cora_get_access_token(string $empresa, bool $forceRefresh = false): array
{
    if (!$forceRefresh) {
        $cached = cora_load_cached_token($empresa);
        if ($cached !== null) return $cached;
    }

    $cfg = cora_empresa_config($empresa);
    $jwt = cora_build_jwt($cfg);

    $body = http_build_query([
        'grant_type'            => 'client_credentials',
        'client_id'             => $cfg['client_id'],
        'client_assertion_type' => 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        'client_assertion'      => $jwt,
    ]);

    $ch = curl_init($cfg['token_url']);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
        ],
        CURLOPT_SSLCERT        => $cfg['cert_path'],
        CURLOPT_SSLKEY         => $cfg['key_path'],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_TIMEOUT        => 15,
    ]);

    $response = curl_exec($ch);
    $http     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException("Cora {$empresa}: erro de rede no token endpoint — {$err}");
    }
    $json = json_decode((string) $response, true);
    if ($http >= 400 || !isset($json['access_token'])) {
        $msg = $json['error_description'] ?? $json['error'] ?? $response;
        throw new RuntimeException("Cora {$empresa}: token endpoint retornou {$http} — {$msg}");
    }

    $token = [
        'access_token' => (string) $json['access_token'],
        'token_type'   => (string) ($json['token_type'] ?? 'Bearer'),
        'expires_in'   => (int) ($json['expires_in'] ?? 3600),
        'expires_at'   => time() + (int) ($json['expires_in'] ?? 3600),
        'obtained_at'  => time(),
    ];
    cora_save_cached_token($empresa, $token);
    return $token;
}

// ----------------------------------------------------------------------------
// Chamada autenticada à API (mTLS + Bearer token)
// ----------------------------------------------------------------------------

function cora_request(string $empresa, string $method, string $path, ?array $body = null, array $extraHeaders = []): array
{
    $cfg   = cora_empresa_config($empresa);
    $token = cora_get_access_token($empresa);

    $url = $cfg['base_url'] . '/' . ltrim($path, '/');
    $ch  = curl_init($url);

    $headers = array_merge([
        'Authorization: Bearer ' . $token['access_token'],
        'Accept: application/json',
        'Content-Type: application/json',
    ], $extraHeaders);

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => strtoupper($method),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_SSLCERT        => $cfg['cert_path'],
        CURLOPT_SSLKEY         => $cfg['key_path'],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_TIMEOUT        => 30,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);

    $response = curl_exec($ch);
    $http     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException("Cora {$empresa}: erro de rede em {$method} {$path} — {$err}");
    }

    return [
        'http_code' => $http,
        'body_raw'  => (string) $response,
        'body'      => json_decode((string) $response, true),
    ];
}

// ----------------------------------------------------------------------------
// Validação de assinatura HMAC do webhook
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Mapeamento de eventos Cora → status interno
// Aceita múltiplas convenções de nome (Cora pode usar payment.* ou transfer.*)
// ----------------------------------------------------------------------------

function cora_classificar_evento(?string $evento): string
{
    $e = strtolower((string) $evento);
    if ($e === '') return 'desconhecido';

    // Confirmação / liquidação
    foreach (['confirmed', 'completed', 'settled', 'success', 'paid'] as $kw) {
        if (str_contains($e, $kw)) return 'concluida';
    }
    // Falha / rejeição
    foreach (['failed', 'rejected', 'denied', 'error'] as $kw) {
        if (str_contains($e, $kw)) return 'rejeitada';
    }
    // Cancelamento
    foreach (['cancelled', 'canceled', 'voided'] as $kw) {
        if (str_contains($e, $kw)) return 'cancelada';
    }
    // Criação / agendamento (estado intermediário)
    foreach (['created', 'scheduled', 'pending', 'awaiting'] as $kw) {
        if (str_contains($e, $kw)) return 'aguardando_aprovacao';
    }
    return 'desconhecido';
}

/**
 * Processa um evento de webhook Cora — atualiza transferencias_cora e folhas.
 *
 * Idempotente: se o cora_transfer_id já está no status alvo, retorna sem
 * gravar de novo. Webhooks reentregues não causam efeito duplo.
 *
 * Retorna ['processado' => bool, 'motivo' => string, 'transferencia_id' => ?int]
 */
function cora_processar_evento(string $coraTransferId, string $statusAlvo, array $payload): array
{
    if ($coraTransferId === '' || $statusAlvo === 'desconhecido') {
        return ['processado' => false, 'motivo' => 'evento sem cora_transfer_id ou tipo desconhecido', 'transferencia_id' => null];
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, folha_id, funcionario_id, competencia, status
         FROM transferencias_cora
         WHERE cora_transfer_id = :cid
         LIMIT 1'
    );
    $stmt->execute([':cid' => $coraTransferId]);
    $tr = $stmt->fetch();

    if (!$tr) {
        return ['processado' => false, 'motivo' => 'transferência não encontrada para cora_transfer_id', 'transferencia_id' => null];
    }
    if ($tr['status'] === $statusAlvo) {
        return ['processado' => false, 'motivo' => 'já está no status alvo (idempotência)', 'transferencia_id' => (int) $tr['id']];
    }

    $pdo->beginTransaction();
    try {
        // Atualiza transferencias_cora
        $pdo->prepare(
            'UPDATE transferencias_cora
             SET status = :st, response_payload = :pl
             WHERE id = :id'
        )->execute([
            ':st' => $statusAlvo,
            ':pl' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            ':id' => $tr['id'],
        ]);

        // Atualiza folhas conforme status alvo
        $folhaStatus = match ($statusAlvo) {
            'concluida'            => 'pago',
            'rejeitada'            => 'pendente', // volta pra pendente para nova tentativa
            'cancelada'            => 'cancelada',
            'aguardando_aprovacao' => 'transferido',
            default                => null,
        };

        if ($folhaStatus !== null && (int) $tr['funcionario_id'] > 0 && $tr['competencia']) {
            $dataPag = $folhaStatus === 'pago' ? "CURDATE()" : 'NULL';
            $pdo->prepare(
                "INSERT INTO folhas (funcionario_id, competencia, status, data_pagamento)
                 VALUES (:fid, :comp, :st, {$dataPag})
                 ON DUPLICATE KEY UPDATE
                   status = VALUES(status),
                   data_pagamento = " . ($folhaStatus === 'pago' ? 'CURDATE()' : 'NULL')
            )->execute([
                ':fid'  => (int) $tr['funcionario_id'],
                ':comp' => $tr['competencia'],
                ':st'   => $folhaStatus,
            ]);
        }

        $pdo->commit();
        return ['processado' => true, 'motivo' => "status atualizado para {$statusAlvo}", 'transferencia_id' => (int) $tr['id']];
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['processado' => false, 'motivo' => 'erro DB: ' . $e->getMessage(), 'transferencia_id' => (int) $tr['id']];
    }
}

// ----------------------------------------------------------------------------
// Validação de assinatura HMAC do webhook
// ----------------------------------------------------------------------------

function cora_validate_webhook_signature(string $empresa, string $rawBody, string $signatureHeader): bool
{
    $cfg = cora_empresa_config($empresa);
    if ($cfg['webhook_secret'] === '') return false;

    $signatureHeader = trim($signatureHeader);
    if ($signatureHeader === '') return false;
    // Cora pode prefixar com algoritmo (ex: "sha256=...")
    if (str_contains($signatureHeader, '=')) {
        [, $sig] = explode('=', $signatureHeader, 2);
        $signatureHeader = trim($sig);
    }

    $expected = hash_hmac('sha256', $rawBody, $cfg['webhook_secret']);
    return hash_equals($expected, $signatureHeader);
}
