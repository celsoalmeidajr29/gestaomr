<?php
/**
 * Proxy Google Drive API v3 — listar arquivos.
 * GET ?q=termo           → busca por nome
 * GET ?type=notas        → filtra arquivos .md / text/markdown
 * GET (sem params)       → 30 arquivos mais recentes
 * Retorna: [{ id, name, mimeType, modifiedTime, webViewLink, iconLink }]
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u = require_permission('cerebro');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

$access_token = google_access_token((int) $u['id']);
if (!$access_token) {
    json_error('Google não conectado. Autorize o acesso primeiro.', 401);
}

$q    = trim((string) ($_GET['q']    ?? ''));
$type = trim((string) ($_GET['type'] ?? ''));

// Monta o query do Drive
$driveQuery = "trashed = false";

if ($type === 'notas') {
    // Arquivos Markdown no Drive
    $driveQuery .= " and (mimeType = 'text/markdown' or name contains '.md')";
} elseif ($q !== '') {
    $safe = addslashes($q);
    $driveQuery .= " and name contains '{$safe}'";
}

$params = [
    'q'        => $driveQuery,
    'orderBy'  => 'modifiedTime desc',
    'pageSize' => 50,
    'fields'   => 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)',
];

$url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query($params);
$result = google_http_get($url, $access_token);

if (!empty($result['error'])) {
    $msg = $result['error']['message'] ?? 'Erro na Google Drive API';
    $code = (int) ($result['error']['code'] ?? 500);
    json_error($msg, $code ?: 500);
}

$arquivos = array_map(fn($f) => [
    'id'           => $f['id']           ?? null,
    'name'         => $f['name']         ?? '',
    'mimeType'     => $f['mimeType']     ?? '',
    'modifiedTime' => $f['modifiedTime'] ?? null,
    'webViewLink'  => $f['webViewLink']  ?? null,
    'iconLink'     => $f['iconLink']     ?? null,
    'size'         => isset($f['size']) ? (int) $f['size'] : null,
], $result['files'] ?? []);

json_response($arquivos);
