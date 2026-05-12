<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u      = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$token  = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado.', 401);

$BASE = 'https://keep.googleapis.com/v1';

// ---- GET: listar notas ----
if ($method === 'GET') {
    $resp = google_http_get("{$BASE}/notes?pageSize=100", $token);
    if (isset($resp['error'])) {
        json_error(
            is_array($resp['error']) ? ($resp['error']['message'] ?? 'Erro Keep API') : $resp['error'],
            502
        );
    }
    $notes = [];
    foreach ($resp['notes'] ?? [] as $n) {
        if (!empty($n['trashed'])) continue;
        $body        = $n['body'] ?? [];
        $text        = null;
        $isChecklist = false;
        $items       = [];
        if (isset($body['text']['text'])) {
            $text = $body['text']['text'];
        } elseif (isset($body['list']['listItems'])) {
            $isChecklist = true;
            foreach ($body['list']['listItems'] as $item) {
                if (empty($item['text']['text'])) continue;
                $items[] = ['checked' => (bool) ($item['checked'] ?? false), 'text' => $item['text']['text']];
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
}

$d = json_input();

// ---- POST: criar nota ----
if ($method === 'POST') {
    $payload = ['title' => $d['title'] ?? ''];
    if (!empty($d['text'])) {
        $payload['body'] = ['text' => ['text' => $d['text']]];
    } elseif (!empty($d['items'])) {
        $payload['body'] = ['list' => ['listItems' => array_map(fn($i) => [
            'checked' => (bool) ($i['checked'] ?? false),
            'text'    => ['text' => $i['text'] ?? ''],
        ], $d['items'])]];
    }
    $result = google_http_post_json("{$BASE}/notes", $payload, $token);
    if (!empty($result['error'])) {
        json_error(
            is_array($result['error']) ? ($result['error']['message'] ?? 'Erro ao criar nota') : $result['error'],
            502
        );
    }
    json_response($result, 201);
}

// ---- PATCH: editar nota ----
if ($method === 'PATCH') {
    $noteId = trim((string) ($d['id'] ?? ''));
    if (!$noteId) json_error('id obrigatorio', 400);
    $fields  = [];
    $payload = [];
    if (array_key_exists('title', $d)) { $payload['title'] = $d['title']; $fields[] = 'title'; }
    if (array_key_exists('text',  $d)) {
        $payload['body'] = ['text' => ['text' => $d['text']]];
        $fields[] = 'body';
    }
    if (!$fields) json_error('Nenhum campo para atualizar', 422);
    $result = google_http_patch("{$BASE}/{$noteId}?updateMask=" . implode(',', $fields), $payload, $token);
    if (!empty($result['error'])) {
        json_error(
            is_array($result['error']) ? ($result['error']['message'] ?? 'Erro ao atualizar nota') : $result['error'],
            502
        );
    }
    json_response(['ok' => true]);
}

// ---- DELETE: mover nota para lixeira ----
if ($method === 'DELETE') {
    $noteId = trim((string) ($d['id'] ?? ''));
    if (!$noteId) json_error('id obrigatorio', 400);
    google_http_delete("{$BASE}/{$noteId}", $token);
    json_response(['ok' => true]);
}

json_error('Metodo nao permitido', 405);
