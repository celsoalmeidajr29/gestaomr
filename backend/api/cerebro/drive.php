<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u = require_permission('cerebro');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_error('Metodo nao permitido', 405);

$token = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado.', 401);

$q      = trim((string) ($_GET['q']      ?? ''));
$type   = trim((string) ($_GET['type']   ?? ''));
$folder = trim((string) ($_GET['folder'] ?? ''));

// ---- Busca pasta por nome (ex: q=Brain&type=folder) ----
if ($type === 'folder') {
    $safe   = str_replace("'", "\\'", $q);
    $result = google_http_get(
        'https://www.googleapis.com/drive/v3/files?' . http_build_query([
            'q'        => "name = '{$safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            'pageSize' => 5,
            'fields'   => 'files(id,name)',
        ]),
        $token
    );
    if (!empty($result['error'])) json_error($result['error']['message'] ?? 'Erro Drive API', 502);
    json_response($result['files'] ?? []);
}

// ---- Navegar pasta ----
if ($folder !== '') {
    $safe   = str_replace("'", "\\'", $folder);
    $qParts = ["'{$safe}' in parents", 'trashed = false'];

    // type=notas → pastas + arquivos .md
    if ($type === 'notas') {
        $qParts[] = "(mimeType = 'application/vnd.google-apps.folder'"
                  . " or mimeType = 'text/markdown'"
                  . " or mimeType = 'text/plain'"
                  . " or name contains '.md')";
    }

    $result = google_http_get(
        'https://www.googleapis.com/drive/v3/files?' . http_build_query([
            'q'        => implode(' and ', $qParts),
            'orderBy'  => 'folder,name',
            'pageSize' => 200,
            'fields'   => 'files(id,name,mimeType,modifiedTime,webViewLink,size,thumbnailLink)',
        ]),
        $token
    );
    if (!empty($result['error'])) json_error($result['error']['message'] ?? 'Erro Drive API', 502);

    $items = array_map(fn($f) => [
        'id'            => $f['id']            ?? null,
        'name'          => $f['name']          ?? '',
        'mimeType'      => $f['mimeType']      ?? '',
        'isFolder'      => ($f['mimeType'] ?? '') === 'application/vnd.google-apps.folder',
        'modifiedTime'  => $f['modifiedTime']  ?? null,
        'webViewLink'   => $f['webViewLink']   ?? null,
        'size'          => isset($f['size']) ? (int) $f['size'] : null,
        'thumbnailLink' => $f['thumbnailLink'] ?? null,
    ], $result['files'] ?? []);

    // Pastas primeiro, depois por nome
    usort($items, fn($a, $b) => (int)$b['isFolder'] <=> (int)$a['isFolder'] ?: strcmp($a['name'], $b['name']));
    json_response($items);
}

// ---- Busca global / recentes ----
$driveQuery = 'trashed = false';
if ($type === 'notas') {
    $driveQuery .= " and (mimeType = 'text/markdown' or name contains '.md')";
} elseif ($q !== '') {
    $safe = str_replace("'", "\\'", $q);
    $driveQuery .= " and name contains '{$safe}'";
}

$result = google_http_get(
    'https://www.googleapis.com/drive/v3/files?' . http_build_query([
        'q'        => $driveQuery,
        'orderBy'  => 'modifiedTime desc',
        'pageSize' => 50,
        'fields'   => 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)',
    ]),
    $token
);
if (!empty($result['error'])) {
    json_error($result['error']['message'] ?? 'Erro Drive API', (int)($result['error']['code'] ?? 500) ?: 500);
}

json_response(array_map(fn($f) => [
    'id'           => $f['id']           ?? null,
    'name'         => $f['name']         ?? '',
    'mimeType'     => $f['mimeType']     ?? '',
    'isFolder'     => false,
    'modifiedTime' => $f['modifiedTime'] ?? null,
    'webViewLink'  => $f['webViewLink']  ?? null,
    'iconLink'     => $f['iconLink']     ?? null,
    'size'         => isset($f['size']) ? (int) $f['size'] : null,
], $result['files'] ?? []));
