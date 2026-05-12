<?php
/**
 * Proxy Google Calendar API v3.
 * GET ?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Retorna: [{ title, start, end, allDay, location, description }]
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

// Intervalo padrão: hoje + 7 dias
$start = $_GET['start'] ?? date('Y-m-d');
$end   = $_GET['end']   ?? date('Y-m-d', strtotime('+7 days'));

// Valida formato das datas
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
    json_error('Formato de data inválido. Use YYYY-MM-DD.', 400);
}

$timeMin = $start . 'T00:00:00-03:00';
$timeMax = $end   . 'T23:59:59-03:00';

$url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?' . http_build_query([
    'timeMin'      => $timeMin,
    'timeMax'      => $timeMax,
    'singleEvents' => 'true',
    'orderBy'      => 'startTime',
    'maxResults'   => 100,
    'fields'       => 'items(id,summary,start,end,location,description,htmlLink)',
]);

$result = google_http_get($url, $access_token);

if (!empty($result['error'])) {
    $msg = $result['error']['message'] ?? ($result['error'] ?? 'Erro na Google Calendar API');
    $code = (int) ($result['error']['code'] ?? 500);
    json_error($msg, $code ?: 500);
}

$eventos = array_map(function (array $ev) {
    $startRaw = $ev['start']['dateTime'] ?? $ev['start']['date'] ?? null;
    $endRaw   = $ev['end']['dateTime']   ?? $ev['end']['date']   ?? null;
    $allDay   = !isset($ev['start']['dateTime']);
    return [
        'id'          => $ev['id']          ?? null,
        'title'       => $ev['summary']     ?? '(sem título)',
        'start'       => $startRaw,
        'end'         => $endRaw,
        'allDay'      => $allDay,
        'location'    => $ev['location']    ?? null,
        'description' => $ev['description'] ?? null,
        'link'        => $ev['htmlLink']    ?? null,
    ];
}, $result['items'] ?? []);

json_response($eventos);
