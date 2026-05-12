<?php
/**
 * Proxy Google Tasks API v1.
 * GET → lista todas as task lists e tarefas pendentes (needsAction).
 * Retorna: [{ listId, listName, tasks: [{ id, title, due, notes, updated }] }]
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

// 1. Lista as task lists
$listsResult = google_http_get(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20',
    $access_token
);

if (!empty($listsResult['error'])) {
    $msg = $listsResult['error']['message'] ?? 'Erro na Google Tasks API';
    json_error($msg, 500);
}

$listas = $listsResult['items'] ?? [];
$resposta = [];

// 2. Para cada lista, busca as tarefas pendentes
foreach ($listas as $lista) {
    $listId = $lista['id'];
    $tasksResult = google_http_get(
        'https://tasks.googleapis.com/tasks/v1/lists/' . urlencode($listId) . '/tasks?' . http_build_query([
            'showCompleted' => 'false',
            'showHidden'    => 'false',
            'maxResults'    => 100,
            'fields'        => 'items(id,title,due,notes,updated,status)',
        ]),
        $access_token
    );

    if (!empty($tasksResult['error'])) {
        continue; // ignora erros em listas individuais
    }

    $tarefas = array_filter($tasksResult['items'] ?? [], fn($t) => ($t['status'] ?? '') === 'needsAction');
    $tarefas = array_values(array_map(fn($t) => [
        'id'      => $t['id']      ?? null,
        'title'   => $t['title']   ?? '(sem título)',
        'due'     => $t['due']     ?? null,
        'notes'   => $t['notes']   ?? null,
        'updated' => $t['updated'] ?? null,
    ], $tarefas));

    if (count($tarefas) > 0 || count($listas) === 1) {
        $resposta[] = [
            'listId'   => $listId,
            'listName' => $lista['title'] ?? 'Lista',
            'tasks'    => $tarefas,
        ];
    }
}

json_response($resposta);
