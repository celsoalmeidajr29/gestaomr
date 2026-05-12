<?php
/**
 * MRSys — Bootstrap do backend
 *
 * Carrega .env, configura sessão segura, abre conexão PDO e expõe
 * helpers JSON consumidos pelos endpoints em /api/.
 *
 * Convenção de retorno:
 *   sucesso: { "ok": true,  "data": ... }
 *   erro:    { "ok": false, "error": "...", ... }
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1. Carregamento do .env (parser próprio — sem Composer)
// ---------------------------------------------------------------------------

function load_env(string $path): void
{
    if (!is_readable($path)) {
        throw new RuntimeException("Arquivo .env não encontrado em: {$path}");
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // Remove comentário inline (após espaço + #)
        if (preg_match('/^([^#]*?)\s+#/', $value, $m)) {
            $value = trim($m[1]);
        }
        // Remove aspas envolvendo o valor
        $first = $value[0] ?? '';
        $last = $value[strlen($value) - 1] ?? '';
        if (strlen($value) >= 2 && (($first === '"' && $last === '"') || ($first === "'" && $last === "'"))) {
            $value = substr($value, 1, -1);
        }
        $_ENV[$key] = $value;
        putenv("{$key}={$value}");
    }
}

load_env(__DIR__ . '/.env');

function env(string $key, $default = null)
{
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    $val = getenv($key);
    return ($val === false) ? $default : $val;
}

function env_bool(string $key, bool $default = false): bool
{
    $val = env($key, $default ? 'true' : 'false');
    return filter_var($val, FILTER_VALIDATE_BOOLEAN);
}

function env_int(string $key, int $default = 0): int
{
    return (int) env($key, $default);
}

// ---------------------------------------------------------------------------
// 2. Erro / debug
// ---------------------------------------------------------------------------

date_default_timezone_set((string) env('APP_TIMEZONE', 'America/Sao_Paulo'));

$debug = env_bool('APP_DEBUG', false);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Em produção, qualquer erro/exceção não tratado vira 500 com JSON
set_exception_handler(function (Throwable $e) use ($debug) {
    error_log('[MRSys] ' . $e::class . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'ok' => false,
        'error' => $debug ? $e->getMessage() : 'Erro interno do servidor',
        'trace' => $debug ? explode("\n", $e->getTraceAsString()) : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// ---------------------------------------------------------------------------
// 3. Sessão segura
// ---------------------------------------------------------------------------

function bootstrap_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = env_bool('SESSION_SECURE', true);
    $httponly = env_bool('SESSION_HTTPONLY', true);
    $lifetime_seconds = env_int('SESSION_LIFETIME', 480) * 60;

    // SameSite: 'None' é obrigatório quando frontend e backend ficam em origens
    // diferentes (ex: Cloudflare Pages + Hostinger). Exige SESSION_SECURE=true.
    $samesite = (string) env('SESSION_SAMESITE', 'Lax');

    session_set_cookie_params([
        'lifetime' => 0,                    // cookie de sessão (some ao fechar o browser)
        'path' => '/',
        'secure' => $secure,
        'httponly' => $httponly,
        'samesite' => $samesite,
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) $lifetime_seconds);
    session_name('mrsys_sid');
    session_start();

    // Inatividade — se passou o limite, mata a sessão
    if (isset($_SESSION['_last_activity']) && (time() - (int) $_SESSION['_last_activity']) > $lifetime_seconds) {
        $_SESSION = [];
        session_destroy();
        session_start();
    }
    $_SESSION['_last_activity'] = time();
}

// ---------------------------------------------------------------------------
// 4. Conexão PDO (singleton)
// ---------------------------------------------------------------------------

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        env('DB_HOST', 'localhost'),
        env_int('DB_PORT', 3306),
        env('DB_NAME', ''),
        env('DB_CHARSET', 'utf8mb4')
    );
    $pdo = new PDO($dsn, (string) env('DB_USER', ''), (string) env('DB_PASS', ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    // Garante timezone do banco no horário de Brasília
    $pdo->exec("SET time_zone = '-03:00'");
    return $pdo;
}

// ---------------------------------------------------------------------------
// 5. Helpers JSON
// ---------------------------------------------------------------------------

function json_response($data = null, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400, ?array $extra = null): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $payload = ['ok' => false, 'error' => $message];
    if ($extra) {
        $payload = array_merge($payload, $extra);
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_input(): array
{
    static $body = null;
    if ($body !== null) {
        return $body;
    }
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return $body = [];
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        json_error('JSON inválido: ' . json_last_error_msg(), 400);
    }
    return $body = is_array($data) ? $data : [];
}

// ---------------------------------------------------------------------------
// 6. Auth — recupera e exige usuário logado
// ---------------------------------------------------------------------------

function current_user(): ?array
{
    bootstrap_session();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $stmt = db()->prepare(
        'SELECT u.id, u.nome, u.email, u.perfil_id, u.status,
                u.acesso_mrsys, u.acesso_pareceto, u.acesso_cerebro,
                p.codigo AS perfil_codigo, p.nome AS perfil_nome, p.permissoes
           FROM usuarios u
           JOIN perfis p ON p.id = u.perfil_id
          WHERE u.id = :id
          LIMIT 1'
    );
    $stmt->execute([':id' => (int) $_SESSION['user_id']]);
    $u = $stmt->fetch();
    if (!$u) {
        return null;
    }
    $u['permissoes'] = json_decode((string) $u['permissoes'], true) ?: [];
    return $cache = $u;
}

function require_auth(): array
{
    $u = current_user();
    if (!$u) {
        json_error('Não autenticado', 401);
    }
    if ($u['status'] !== 'ATIVO') {
        json_error('Usuário inativo ou bloqueado', 403);
    }
    // Disponibiliza @usuario_id para os triggers de auditoria do schema
    $stmt = db()->prepare('SET @usuario_id = :id');
    $stmt->execute([':id' => (int) $u['id']]);
    return $u;
}

// ---------------------------------------------------------------------------
// 6b. Permissões — verifica bit em perfis.permissoes para o recurso/ação
// ---------------------------------------------------------------------------
// Admin (perfil_codigo='admin') passa direto. Para os demais perfis a
// coluna perfis.permissoes é um JSON  {"servicos":{"read":true,"create":false,...}}
// $action pode ser 'read'|'create'|'edit'|'delete'|'auto'.
// Com 'auto' a ação é inferida pelo método HTTP:
//   GET→read, POST→create, PUT|PATCH→edit, DELETE→delete.

function require_permission(string $resource, string $action = 'auto'): array
{
    $u = require_auth();

    if ($u['perfil_codigo'] === 'admin') {
        return $u;
    }

    if ($action === 'auto') {
        $action = match ($_SERVER['REQUEST_METHOD']) {
            'GET'           => 'read',
            'POST'          => 'create',
            'PUT', 'PATCH'  => 'edit',
            'DELETE'        => 'delete',
            default         => 'read',
        };
    }

    $perms = is_array($u['permissoes']) ? $u['permissoes'] : (json_decode($u['permissoes'] ?? '{}', true) ?: []);
    if (empty($perms[$resource][$action])) {
        json_error('Sem permissão para esta operação', 403);
    }

    return $u;
}

// ---------------------------------------------------------------------------
// 7. CSRF — token na sessão, validado em métodos não-idempotentes
// ---------------------------------------------------------------------------

function csrf_token(): string
{
    bootstrap_session();
    if (empty($_SESSION['_csrf'])) {
        $_SESSION['_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['_csrf'];
}

function require_csrf(): void
{
    bootstrap_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['_csrf'] ?? null);
    $stored = $_SESSION['_csrf'] ?? '';
    if (!$sent || !is_string($sent) || $stored === '' || !hash_equals($stored, $sent)) {
        json_error('Token CSRF inválido ou ausente', 419);
    }
}

// ---------------------------------------------------------------------------
// 8. Cliente — IP / UA (para auditoria e tabela sessoes)
// ---------------------------------------------------------------------------

function client_ip(): string
{
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($fwd !== '') {
        $first = trim(explode(',', $fwd)[0]);
        if ($first !== '') {
            return $first;
        }
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function client_ua(): string
{
    return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
}

// ---------------------------------------------------------------------------
// 9. CORS — autoriza apenas origens explicitamente listadas em CORS_ALLOWED_ORIGINS
// ---------------------------------------------------------------------------
//
// Cenário atual: frontend e backend no mesmo domínio (Hostinger).
// Neste cenário o browser não envia header Origin em requisições same-origin,
// então handle_cors() retorna imediatamente sem adicionar cabeçalhos.
//
// Se no futuro o frontend migrar para um domínio diferente, configure:
//   CORS_ALLOWED_ORIGINS=https://mrsys.grupomr.seg.br
//   SESSION_SAMESITE=None
//   SESSION_SECURE=true

function handle_cors(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return; // mesma origem ou request sem Origin (curl, etc)
    }
    $raw = (string) env('CORS_ALLOWED_ORIGINS', '');
    $allowed = array_values(array_filter(array_map('trim', explode(',', $raw))));
    if (!in_array($origin, $allowed, true)) {
        // Origem desconhecida: não envia cabeçalhos CORS — o navegador bloqueia.
        // Se for OPTIONS, ainda assim respondemos 403 limpo pra não confundir o cliente.
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(403);
            exit;
        }
        return;
    }
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, X-Requested-With, Accept');
    header('Access-Control-Max-Age: 86400');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        // Preflight: encerra sem rodar nada do app
        http_response_code(204);
        exit;
    }
}

// ---------------------------------------------------------------------------
// Inicialização — CORS antes da sessão (preflight não deve criar sessão)
// ---------------------------------------------------------------------------

handle_cors();
bootstrap_session();
