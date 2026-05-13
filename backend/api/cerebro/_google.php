<?php
/**
 * Helpers Google OAuth2 + API — sem Composer, PHP puro com stream_context.
 *
 * Escopos usados:
 *   calendar.readonly  · tasks.readonly  · drive.readonly
 */

declare(strict_types=1);

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
];

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/** POST para URL com dados application/x-www-form-urlencoded; retorna array. */
function google_http_post(string $url, array $data): array
{
    $payload = http_build_query($data);
    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/x-www-form-urlencoded\r\n" .
                           'Content-Length: ' . strlen($payload) . "\r\n",
        'content'       => $payload,
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return ['error' => 'Falha na conexão com o servidor Google'];
    return json_decode($resp, true) ?? [];
}

/** GET autenticado; retorna array JSON decodificado. */
function google_http_get(string $url, string $access_token): array
{
    $ctx = stream_context_create(['http' => [
        'method'        => 'GET',
        'header'        => "Authorization: Bearer {$access_token}\r\n",
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return ['error' => 'Falha na conexão com a Google API'];
    return json_decode($resp, true) ?? [];
}

/** POST JSON autenticado (criar recursos). */
function google_http_post_json(string $url, array $data, string $access_token): array
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Authorization: Bearer {$access_token}\r\n" .
                           "Content-Type: application/json; charset=utf-8\r\n" .
                           'Content-Length: ' . strlen($json) . "\r\n",
        'content'       => $json,
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return ['error' => ['message' => 'Falha na conexão com a Google API']];
    return json_decode($resp, true) ?? [];
}

/** PATCH JSON autenticado (atualização parcial). */
function google_http_patch(string $url, array $data, string $access_token): array
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    $ctx = stream_context_create(['http' => [
        'method'        => 'PATCH',
        'header'        => "Authorization: Bearer {$access_token}\r\n" .
                           "Content-Type: application/json; charset=utf-8\r\n" .
                           'Content-Length: ' . strlen($json) . "\r\n",
        'content'       => $json,
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return ['error' => ['message' => 'Falha na conexão com a Google API']];
    return json_decode($resp, true) ?? [];
}

/** DELETE autenticado. */
function google_http_delete(string $url, string $access_token): void
{
    $ctx = stream_context_create(['http' => [
        'method'        => 'DELETE',
        'header'        => "Authorization: Bearer {$access_token}\r\n",
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    @file_get_contents($url, false, $ctx);
}

/** GET autenticado; retorna string bruta (para download de arquivo). */
function google_http_get_raw(string $url, string $access_token): ?string
{
    $ctx = stream_context_create(['http' => [
        'method'        => 'GET',
        'header'        => "Authorization: Bearer {$access_token}\r\n",
        'ignore_errors' => true,
        'timeout'       => 20,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    return $resp !== false ? $resp : null;
}

// ---------------------------------------------------------------------------
// OAuth2 URLs e troca de tokens
// ---------------------------------------------------------------------------

/** Verifica se a migration 022 (slot + email em cerebro_tokens) foi aplicada. */
function _cerebro_slots_enabled(): bool
{
    static $v = null;
    if ($v === null) {
        try {
            $v = (bool) db()->query(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'cerebro_tokens' AND COLUMN_NAME = 'slot'"
            )->fetchColumn();
        } catch (\Throwable $e) { $v = false; }
    }
    return $v;
}

/** Gera a URL de autorização Google OAuth2. Codifica o slot no state para o callback. */
function google_auth_url(int $slot = 0): string
{
    return 'https://accounts.google.com/o/oauth2/auth?' . http_build_query([
        'client_id'     => env('GOOGLE_CLIENT_ID', ''),
        'redirect_uri'  => env('GOOGLE_REDIRECT_URI') ?: rtrim((string) env('APP_URL', 'https://celso.cloud'), '/') . '/api/cerebro/auth/callback.php',
        'response_type' => 'code',
        'scope'         => implode(' ', GOOGLE_SCOPES),
        'access_type'   => 'offline',
        'prompt'        => 'consent',   // força emissão de refresh_token
        'state'         => base64_encode((string) $slot),
    ]);
}

/** Retorna o e-mail da conta Google a partir do access_token. */
function google_user_info(string $access_token): ?string
{
    $result = google_http_get('https://www.googleapis.com/oauth2/v2/userinfo?fields=email', $access_token);
    return $result['email'] ?? null;
}

/** Troca authorization code por access_token + refresh_token. */
function google_exchange_code(string $code): array
{
    return google_http_post('https://oauth2.googleapis.com/token', [
        'code'          => $code,
        'client_id'     => env('GOOGLE_CLIENT_ID', ''),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'redirect_uri'  => env('GOOGLE_REDIRECT_URI') ?: rtrim((string) env('APP_URL', 'https://celso.cloud'), '/') . '/api/cerebro/auth/callback.php',
        'grant_type'    => 'authorization_code',
    ]);
}

/** Renova o access_token usando o refresh_token. */
function google_refresh(string $refresh_token): array
{
    return google_http_post('https://oauth2.googleapis.com/token', [
        'refresh_token' => $refresh_token,
        'client_id'     => env('GOOGLE_CLIENT_ID', ''),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'grant_type'    => 'refresh_token',
    ]);
}

/** Revoga token no Google. */
function google_revoke(string $token): void
{
    @file_get_contents(
        'https://oauth2.googleapis.com/revoke?' . http_build_query(['token' => $token]),
        false,
        stream_context_create(['http' => ['method' => 'POST', 'ignore_errors' => true]])
    );
}

// ---------------------------------------------------------------------------
// Persistência de token no MySQL
// ---------------------------------------------------------------------------

/**
 * Carrega o token do banco para o usuário.
 * slot=0 → conta principal; slot=1 → conta secundária.
 */
function google_load_token(int $usuario_id, int $slot = 0): ?array
{
    if (_cerebro_slots_enabled()) {
        $stmt = db()->prepare(
            'SELECT access_token, refresh_token, expires_at
               FROM cerebro_tokens WHERE usuario_id = :uid AND slot = :slot LIMIT 1'
        );
        $stmt->execute([':uid' => $usuario_id, ':slot' => $slot]);
    } else {
        $stmt = db()->prepare(
            'SELECT access_token, refresh_token, expires_at
               FROM cerebro_tokens WHERE usuario_id = :uid LIMIT 1'
        );
        $stmt->execute([':uid' => $usuario_id]);
    }
    return $stmt->fetch() ?: null;
}

/**
 * Persiste (INSERT ou UPDATE) o token no banco.
 * Preserva refresh_token e email existentes se os novos valores forem nulos.
 */
function google_save_token(int $usuario_id, array $token, int $slot = 0, ?string $email = null): void
{
    $expires_at = isset($token['expires_in'])
        ? time() + (int) $token['expires_in']
        : (int) ($token['expires_at'] ?? 0);

    if (_cerebro_slots_enabled()) {
        $stmt = db()->prepare(
            'INSERT INTO cerebro_tokens (usuario_id, slot, email, access_token, refresh_token, expires_at)
             VALUES (:uid, :slot, :email, :at, :rt, :ea)
             ON DUPLICATE KEY UPDATE
               email         = COALESCE(VALUES(email), email),
               access_token  = VALUES(access_token),
               refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
               expires_at    = VALUES(expires_at)'
        );
        $stmt->execute([
            ':uid'   => $usuario_id,
            ':slot'  => $slot,
            ':email' => $email,
            ':at'    => $token['access_token'],
            ':rt'    => $token['refresh_token'] ?? null,
            ':ea'    => $expires_at,
        ]);
    } else {
        $stmt = db()->prepare(
            'INSERT INTO cerebro_tokens (usuario_id, access_token, refresh_token, expires_at)
             VALUES (:uid, :at, :rt, :ea)
             ON DUPLICATE KEY UPDATE
               access_token  = VALUES(access_token),
               refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
               expires_at    = VALUES(expires_at)'
        );
        $stmt->execute([
            ':uid' => $usuario_id,
            ':at'  => $token['access_token'],
            ':rt'  => $token['refresh_token'] ?? null,
            ':ea'  => $expires_at,
        ]);
    }
}

/** Remove o token do banco (desconectar slot específico). */
function google_delete_token(int $usuario_id, int $slot = 0): void
{
    if (_cerebro_slots_enabled()) {
        db()->prepare('DELETE FROM cerebro_tokens WHERE usuario_id = :uid AND slot = :slot')
            ->execute([':uid' => $usuario_id, ':slot' => $slot]);
    } else {
        db()->prepare('DELETE FROM cerebro_tokens WHERE usuario_id = :uid')
            ->execute([':uid' => $usuario_id]);
    }
}

// ---------------------------------------------------------------------------
// Access token válido (com refresh automático)
// ---------------------------------------------------------------------------

/**
 * Retorna um access_token válido para o usuário/slot.
 * Renova automaticamente se expirado. Retorna null se não conectado.
 */
function google_access_token(int $usuario_id, int $slot = 0): ?string
{
    $token = google_load_token($usuario_id, $slot);
    if (!$token) return null;

    // Token expira em menos de 60 s — precisa renovar
    if ((int) $token['expires_at'] < time() + 60) {
        if (empty($token['refresh_token'])) return null;

        $new = google_refresh($token['refresh_token']);
        if (empty($new['access_token'])) return null;

        // Preserva o refresh_token existente se o novo não trouxer
        $new['refresh_token'] = $new['refresh_token'] ?? $token['refresh_token'];
        google_save_token($usuario_id, $new, $slot);

        return $new['access_token'];
    }

    return $token['access_token'];
}
