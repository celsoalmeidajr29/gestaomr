<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u = require_permission('cerebro');

$fileId = trim((string) ($_GET['id'] ?? ''));
if (!$fileId) json_error('Parametro id obrigatorio', 400);
if (!preg_match('/^[a-zA-Z0-9_\-]{10,}$/', $fileId)) json_error('ID de arquivo invalido', 400);

$token = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado.', 401);

$method = $_SERVER['REQUEST_METHOD'];

// ---- GET: ler arquivo ----
if ($method === 'GET') {
    $meta = google_http_get(
        'https://www.googleapis.com/drive/v3/files/' . urlencode($fileId) . '?fields=id,name,mimeType,modifiedTime',
        $token
    );
    if (!empty($meta['error'])) {
        json_error($meta['error']['message'] ?? 'Arquivo nao encontrado', (int) ($meta['error']['code'] ?? 404) ?: 404);
    }
    $content = google_http_get_raw(
        'https://www.googleapis.com/drive/v3/files/' . urlencode($fileId) . '?alt=media',
        $token
    );
    if ($content === null) json_error('Falha ao baixar conteudo', 500);
    if (strlen($content) > 512_000) {
        $content = substr($content, 0, 512_000) . "\n\n[... arquivo truncado]";
    }
    json_response([
        'id'           => $meta['id']           ?? $fileId,
        'name'         => $meta['name']         ?? 'Arquivo',
        'mimeType'     => $meta['mimeType']     ?? 'text/plain',
        'modifiedTime' => $meta['modifiedTime'] ?? null,
        'content'      => $content,
    ]);
}

// ---- PUT: salvar conteudo do arquivo ----
if ($method === 'PUT') {
    $d       = json_input();
    $content = (string) ($d['content'] ?? '');

    $boundary = 'mrsys_' . bin2hex(random_bytes(8));
    $meta     = json_encode(['mimeType' => 'text/plain']);
    $body     = "--{$boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{$meta}\r\n";
    $body    .= "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n{$content}\r\n";
    $body    .= "--{$boundary}--";

    $ctx = stream_context_create(['http' => [
        'method'        => 'PATCH',
        'header'        => "Authorization: Bearer {$token}\r\n" .
                           "Content-Type: multipart/related; boundary=\"{$boundary}\"\r\n" .
                           'Content-Length: ' . strlen($body) . "\r\n",
        'content'       => $body,
        'ignore_errors' => true,
        'timeout'       => 30,
    ]]);
    $resp   = @file_get_contents(
        'https://www.googleapis.com/upload/drive/v3/files/' . urlencode($fileId) . '?uploadType=multipart',
        false, $ctx
    );
    $result = $resp ? (json_decode($resp, true) ?? []) : [];
    if (!empty($result['error'])) {
        json_error($result['error']['message'] ?? 'Erro ao salvar', 502);
    }
    json_response(['ok' => true, 'modifiedTime' => $result['modifiedTime'] ?? null]);
}

json_error('Metodo nao permitido', 405);
