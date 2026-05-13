<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u = require_permission('cerebro');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_error('Metodo nao permitido', 405);

$token = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado.', 401);

$id   = trim((string) ($_GET['id']   ?? ''));
$type = trim((string) ($_GET['type'] ?? ''));
if (!$id) json_error('id obrigatorio', 400);

// Tipos de exportacao (Google Workspace nativo)
$exportMimes = [
    'doc'    => 'text/html',
    'sheet'  => 'text/csv',
    'slides' => 'text/html',
];

if (isset($exportMimes[$type])) {
    $mime = $exportMimes[$type];
    $url  = 'https://www.googleapis.com/drive/v3/files/' . urlencode($id) . '/export?'
          . http_build_query(['mimeType' => $mime]);
    $raw  = google_http_get_raw($url, $token);
    if ($raw === null) json_error('Falha ao exportar arquivo', 502);
    header("Content-Type: {$mime}; charset=utf-8");
    header('Cache-Control: private, max-age=300');
    header('X-Frame-Options: SAMEORIGIN');
    echo $raw;
    exit;
}

// Download direto (imagem, PDF)
if ($type === 'image' || $type === 'pdf') {
    $url = 'https://www.googleapis.com/drive/v3/files/' . urlencode($id) . '?alt=media';
    $raw = google_http_get_raw($url, $token);
    if ($raw === null) json_error('Falha ao baixar arquivo', 502);
    $mimeOut = $type === 'pdf' ? 'application/pdf' : trim((string) ($_GET['mime'] ?? 'image/jpeg'));
    header("Content-Type: {$mimeOut}");
    header('Cache-Control: private, max-age=300');
    echo $raw;
    exit;
}

json_error('Tipo invalido', 400);
