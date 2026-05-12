<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u      = require_permission('cerebro');
$method = $_SERVER['REQUEST_METHOD'];
$token  = google_access_token((int) $u['id']);
if (!$token) json_error('Google nao conectado.', 401);

$CAL  = 'primary';
$BASE = 'https://www.googleapis.com/calendar/v3/calendars/' . urlencode($CAL);

// ---- GET: listar eventos ----
if ($method === 'GET') {
    $start = $_GET['start'] ?? date('Y-m-d');
    $end   = $_GET['end']   ?? date('Y-m-d', strtotime('+7 days'));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
        json_error('Formato de data invalido.', 400);
    }
    $result = google_http_get($BASE . '/events?' . http_build_query([
        'timeMin'      => $start . 'T00:00:00-03:00',
        'timeMax'      => $end   . 'T23:59:59-03:00',
        'singleEvents' => 'true',
        'orderBy'      => 'startTime',
        'maxResults'   => 100,
        'fields'       => 'items(id,summary,start,end,location,description,htmlLink)',
    ]), $token);
    if (!empty($result['error'])) {
        $msg  = is_array($result['error']) ? ($result['error']['message'] ?? 'Erro Calendar API') : $result['error'];
        $code = (int) ($result['error']['code'] ?? 500);
        json_error($msg, $code ?: 500);
    }
    $eventos = array_map(fn($ev) => [
        'id'          => $ev['id'] ?? null,
        'calendarId'  => $CAL,
        'title'       => $ev['summary'] ?? '(sem titulo)',
        'start'       => $ev['start']['dateTime'] ?? $ev['start']['date'] ?? null,
        'end'         => $ev['end']['dateTime']   ?? $ev['end']['date']   ?? null,
        'allDay'      => !isset($ev['start']['dateTime']),
        'location'    => $ev['location']    ?? null,
        'description' => $ev['description'] ?? null,
        'link'        => $ev['htmlLink']    ?? null,
    ], $result['items'] ?? []);
    json_response($eventos);
}

$d = json_input();

// ---- POST: criar evento ----
if ($method === 'POST') {
    $payload = buildCalendarPayload($d);
    if (!$payload) json_error('Titulo e data de inicio obrigatorios.', 422);
    $result = google_http_post_json("{$BASE}/events", $payload, $token);
    if (!empty($result['error'])) {
        json_error($result['error']['message'] ?? 'Erro ao criar evento', 502);
    }
    json_response(['id' => $result['id'] ?? null, 'link' => $result['htmlLink'] ?? null], 201);
}

// ---- PATCH: editar evento ----
if ($method === 'PATCH') {
    $eventId = trim((string) ($d['id'] ?? ''));
    if (!$eventId) json_error('id obrigatorio', 400);
    $payload = buildCalendarPayload($d);
    $result  = google_http_patch("{$BASE}/events/" . urlencode($eventId), $payload, $token);
    if (!empty($result['error'])) {
        json_error($result['error']['message'] ?? 'Erro ao atualizar evento', 502);
    }
    json_response(['ok' => true]);
}

// ---- DELETE: excluir evento ----
if ($method === 'DELETE') {
    $eventId = trim((string) ($d['id'] ?? ''));
    if (!$eventId) json_error('id obrigatorio', 400);
    google_http_delete("{$BASE}/events/" . urlencode($eventId), $token);
    json_response(['ok' => true]);
}

json_error('Metodo nao permitido', 405);

function buildCalendarPayload(array $d): array
{
    $payload = [];
    if (isset($d['title']))       $payload['summary']     = $d['title'];
    if (isset($d['location']))    $payload['location']    = $d['location'];
    if (isset($d['description'])) $payload['description'] = $d['description'];
    if (!empty($d['start'])) {
        $allDay          = !str_contains($d['start'], 'T');
        $end             = $d['end'] ?? $d['start'];
        $payload['start'] = $allDay
            ? ['date' => substr($d['start'], 0, 10)]
            : ['dateTime' => $d['start'], 'timeZone' => 'America/Sao_Paulo'];
        $payload['end']   = $allDay
            ? ['date' => substr($end, 0, 10)]
            : ['dateTime' => $end, 'timeZone' => 'America/Sao_Paulo'];
    }
    return $payload;
}
