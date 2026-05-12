<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u      = require_permission('cerebro');
$method = $_SERVER['REQUEST_METHOD'];
$token  = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado.', 401);

$BASE = 'https://tasks.googleapis.com/tasks/v1';

// ---- GET: listar tarefas pendentes ----
if ($method === 'GET') {
    $listsResult = google_http_get("{$BASE}/users/@me/lists?maxResults=20", $token);
    if (!empty($listsResult['error'])) {
        json_error($listsResult['error']['message'] ?? 'Erro Tasks API', 500);
    }
    $resposta = [];
    foreach ($listsResult['items'] ?? [] as $lista) {
        $listId = $lista['id'];
        $tr = google_http_get("{$BASE}/lists/" . urlencode($listId) . '/tasks?' . http_build_query([
            'showCompleted' => 'false',
            'showHidden'    => 'false',
            'maxResults'    => 100,
            'fields'        => 'items(id,title,due,notes,updated,status)',
        ]), $token);
        if (!empty($tr['error'])) continue;
        $tarefas = array_values(array_map(fn($t) => [
            'id'      => $t['id']      ?? null,
            'title'   => $t['title']   ?? '(sem titulo)',
            'due'     => $t['due']     ?? null,
            'notes'   => $t['notes']   ?? null,
            'updated' => $t['updated'] ?? null,
        ], array_filter($tr['items'] ?? [], fn($t) => ($t['status'] ?? '') === 'needsAction')));
        if (count($tarefas) > 0 || count($listsResult['items'] ?? []) === 1) {
            $resposta[] = [
                'listId'   => $listId,
                'listName' => $lista['title'] ?? 'Lista',
                'tasks'    => $tarefas,
            ];
        }
    }
    json_response($resposta);
}

$d = json_input();

// ---- POST: criar tarefa ----
if ($method === 'POST') {
    $listId = trim((string) ($d['listId'] ?? '@default'));
    if (!$listId) json_error('listId obrigatorio', 400);
    $payload = ['title' => $d['title'] ?? 'Nova tarefa'];
    if (!empty($d['notes'])) $payload['notes'] = $d['notes'];
    if (!empty($d['due']))   $payload['due']   = $d['due'];
    $result = google_http_post_json("{$BASE}/lists/" . urlencode($listId) . '/tasks', $payload, $token);
    if (!empty($result['error'])) json_error($result['error']['message'] ?? 'Erro ao criar tarefa', 502);
    json_response($result, 201);
}

// ---- PATCH: concluir ou editar tarefa ----
if ($method === 'PATCH') {
    $listId = trim((string) ($d['listId'] ?? ''));
    $taskId = trim((string) ($d['taskId'] ?? ''));
    if (!$listId || !$taskId) json_error('listId e taskId obrigatorios', 400);
    $payload = [];
    if (isset($d['status'])) $payload['status'] = $d['status'];
    if (isset($d['title']))  $payload['title']  = $d['title'];
    if (isset($d['notes']))  $payload['notes']  = $d['notes'];
    if (isset($d['due']))    $payload['due']    = $d['due'];
    $result = google_http_patch(
        "{$BASE}/lists/" . urlencode($listId) . '/tasks/' . urlencode($taskId),
        $payload, $token
    );
    if (!empty($result['error'])) json_error($result['error']['message'] ?? 'Erro ao atualizar tarefa', 502);
    json_response(['ok' => true]);
}

// ---- DELETE: remover tarefa ----
if ($method === 'DELETE') {
    $listId = trim((string) ($d['listId'] ?? ''));
    $taskId = trim((string) ($d['taskId'] ?? ''));
    if (!$listId || !$taskId) json_error('listId e taskId obrigatorios', 400);
    google_http_delete("{$BASE}/lists/" . urlencode($listId) . '/tasks/' . urlencode($taskId), $token);
    json_response(['ok' => true]);
}

json_error('Metodo nao permitido', 405);
