<?php
/**
 * Callback OAuth2 Google.
 * Google redireciona aqui após autorização.
 * Armazena tokens e envia postMessage para o popup do frontend.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';
require_once __DIR__ . '/../_google.php';

// Este endpoint é chamado pelo browser via redirect do Google,
// não via fetch — portanto retorna HTML, não JSON.

bootstrap_session();
$u = current_user();
if (!$u) {
    // Sessão expirada durante o fluxo OAuth — pede para tentar novamente
    echo '<script>window.opener && window.opener.postMessage("google_auth_error:session_expired","*");window.close();</script>';
    exit;
}

if (!empty($_GET['error'])) {
    $err = htmlspecialchars($_GET['error']);
    echo "<script>window.opener && window.opener.postMessage('google_auth_error:{$err}','*');window.close();</script>";
    exit;
}

$code = trim((string) ($_GET['code'] ?? ''));
if (!$code) {
    echo '<script>window.opener && window.opener.postMessage("google_auth_error:no_code","*");window.close();</script>';
    exit;
}

// Lê o slot a partir do state (codificado em base64 por google_auth_url)
$state = trim((string) ($_GET['state'] ?? ''));
$slot  = 0;
if ($state !== '') {
    $decoded = base64_decode($state, true);
    if ($decoded !== false) {
        $s = (int) trim($decoded);
        if ($s === 0 || $s === 1) $slot = $s;
    }
}

// Troca o code por tokens
$token = google_exchange_code($code);

if (!empty($token['error']) || empty($token['access_token'])) {
    $msg = htmlspecialchars($token['error_description'] ?? $token['error'] ?? 'unknown');
    echo "<script>window.opener && window.opener.postMessage('google_auth_error:{$msg}','*');window.close();</script>";
    exit;
}

// Busca o e-mail da conta autorizada para armazenar no banco
$email = null;
try {
    $info  = google_http_get('https://www.googleapis.com/oauth2/v2/userinfo?fields=email', $token['access_token']);
    $email = $info['email'] ?? null;
} catch (\Throwable $e) { /* ignora — e-mail é opcional */ }

// Persiste no banco (slot + email)
google_save_token((int) $u['id'], $token, $slot, $email);

// Notifica o popup pai e fecha
echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Autenticando...</title></head><body style="background:#04040e;color:#dde1f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">';
echo '<p>Conectado com sucesso! Esta janela vai fechar...</p>';
echo '<script>';
echo 'if(window.opener){window.opener.postMessage("google_auth_success","*");}';
echo 'setTimeout(function(){window.close();},1500);';
echo '</script></body></html>';
