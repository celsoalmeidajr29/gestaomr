<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u     = require_auth();
$token = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado. Autorize o acesso no Cerebro.', 401);

$pageSize = min(100, max(1, (int) ($_GET['pageSize'] ?? 100)));
$filter   = !empty($_GET['filter']) ? '&filter=' . urlencode($_GET['filter']) : '';

$resp = google_http_get(
    "https://keep.googleapis.com/v1/notes?pageSize={$pageSize}{$filter}",
    $token
);

if (isset($resp['error'])) {
    json_error($resp['error']['message'] ?? 'Erro ao buscar notas do Keep', 502);
}

$notes = [];
foreach ($resp['notes'] ?? [] as $n) {
    if (!empty($n['trashed'])) continue;

    $body = $n['body'] ?? [];
    $text        = null;
    $isChecklist = false;
    $items       = [];

    if (isset($body['text']['text'])) {
        $text = $body['text']['text'];
    } elseif (isset($body['list']['listItems'])) {
        $isChecklist = true;
        foreach ($body['list']['listItems'] as $item) {
            if (empty($item['text']['text'])) continue;
            $items[] = [
                'checked' => (bool) ($item['checked'] ?? false),
                'text'    => $item['text']['text'],
            ];
        }
    }

    $notes[] = [
        'id'          => $n['name'] ?? '',
        'title'       => $n['title'] ?? '',
        'text'        => $text,
        'isChecklist' => $isChecklist,
        'items'       => $items,
        'createTime'  => $n['createTime'] ?? null,
        'updateTime'  => $n['updateTime'] ?? null,
        'pinned'      => (bool) ($n['pinned'] ?? false),
        'labels'      => array_map(fn($l) => $l['name'] ?? '', $n['labels'] ?? []),
    ];
}

json_response($notes);
