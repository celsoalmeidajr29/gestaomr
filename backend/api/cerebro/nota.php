<?php
/**
 * Proxy para leitura de arquivo do Google Drive.
 * GET ?id=FILE_ID
 * Retorna: { name, content, mimeType, modifiedTime }
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u = require_permission('cerebro');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

$fileId = trim((string) ($_GET['id'] ?? ''));
if (!$fileId) {
    json_error('Parâmetro id obrigatório', 400);
}

// Valida formato básico do ID do Drive (apenas chars permitidos)
if (!preg_match('/^[a-zA-Z0-9_\-]{10,}$/', $fileId)) {
    json_error('ID de arquivo inválido', 400);
}

$access_token = google_access_token((int) $u['id']);
if (!$access_token) {
    json_error('Google não conectado. Autorize o acesso primeiro.', 401);
}

// Busca metadados do arquivo
$meta = google_http_get(
    'https://www.googleapis.com/drive/v3/files/' . urlencode($fileId) . '?fields=id,name,mimeType,modifiedTime',
    $access_token
);

if (!empty($meta['error'])) {
    $msg = $meta['error']['message'] ?? 'Arquivo não encontrado';
    $code = (int) ($meta['error']['code'] ?? 404);
    json_error($msg, $code ?: 404);
}

// Baixa o conteúdo do arquivo
$content = google_http_get_raw(
    'https://www.googleapis.com/drive/v3/files/' . urlencode($fileId) . '?alt=media',
    $access_token
);

if ($content === null) {
    json_error('Falha ao baixar conteúdo do arquivo', 500);
}

// Limita a 500 KB para não travar o frontend
if (strlen($content) > 512_000) {
    $content = substr($content, 0, 512_000) . "\n\n[... arquivo truncado — muito grande para exibição]";
}

json_response([
    'id'           => $meta['id']           ?? $fileId,
    'name'         => $meta['name']         ?? 'Arquivo',
    'mimeType'     => $meta['mimeType']     ?? 'text/plain',
    'modifiedTime' => $meta['modifiedTime'] ?? null,
    'content'      => $content,
]);
