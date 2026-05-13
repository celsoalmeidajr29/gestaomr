<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_google.php';

$u = require_permission('cerebro');
$slot  = (int) ($_GET['slot'] ?? 0);
if ($slot < 0 || $slot > 1) $slot = 0;
$token = google_access_token((int) $u['id'], $slot);
if (!$token) json_error('Conta Gmail nao conectada (slot ' . $slot . ').', 401);

$method = $_SERVER['REQUEST_METHOD'];
$action = trim((string) ($_GET['action'] ?? 'inbox'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gmail_header(array $headers, string $name): string
{
    foreach ($headers as $h) {
        if (strcasecmp((string) ($h['name'] ?? ''), $name) === 0) return (string) ($h['value'] ?? '');
    }
    return '';
}

function gmail_decode_base64url(string $data): string
{
    return (string) base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

function gmail_body(array $payload): string
{
    $mime = (string) ($payload['mimeType'] ?? '');

    if (str_starts_with($mime, 'multipart/')) {
        $html = '';
        $plain = '';
        foreach ($payload['parts'] ?? [] as $part) {
            $sub = gmail_body($part);
            if (($part['mimeType'] ?? '') === 'text/html') {
                $html = $html ?: $sub;
            } else {
                $plain = $plain ?: $sub;
            }
        }
        return $html ?: $plain;
    }

    if (!empty($payload['body']['data'])) {
        $raw = gmail_decode_base64url($payload['body']['data']);
        if ($mime === 'text/html') return $raw;
        // Plain text: wrap in pre-like span
        return '<div style="font-family:monospace;white-space:pre-wrap;font-size:13px">'
             . htmlspecialchars($raw, ENT_QUOTES, 'UTF-8') . '</div>';
    }
    return '';
}

function gmail_msg_meta(array $detail): array
{
    $headers = $detail['payload']['headers'] ?? [];
    return [
        'id'       => $detail['id']       ?? null,
        'threadId' => $detail['threadId'] ?? null,
        'snippet'  => html_entity_decode((string) ($detail['snippet'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'from'     => gmail_header($headers, 'From'),
        'to'       => gmail_header($headers, 'To'),
        'subject'  => gmail_header($headers, 'Subject'),
        'date'     => gmail_header($headers, 'Date'),
        'unread'   => in_array('UNREAD', (array) ($detail['labelIds'] ?? [])),
    ];
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

if ($method === 'GET') {
    if ($action === 'inbox' || $action === 'sent' || $action === 'search') {
        $q = $action === 'sent'   ? 'in:sent'
           : ($action === 'search' ? trim((string) ($_GET['q'] ?? '')) : 'in:inbox');
        if (!empty($_GET['q']) && $action !== 'search') {
            $q = trim((string) $_GET['q']);
        }

        $list = google_http_get(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?' . http_build_query([
                'q'          => $q,
                'maxResults' => 15,
                'fields'     => 'messages(id,threadId)',
            ]),
            $token
        );
        if (!empty($list['error'])) json_error($list['error']['message'] ?? 'Erro Gmail', 502);

        $messages = [];
        foreach ($list['messages'] ?? [] as $msg) {
            $detail = google_http_get(
                'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . urlencode($msg['id'])
                . '?' . http_build_query([
                    'format'          => 'metadata',
                    'metadataHeaders' => 'From,To,Subject,Date',
                ]),
                $token
            );
            if (!empty($detail['error'])) continue;
            $messages[] = gmail_msg_meta($detail);
        }
        json_response($messages);
    }

    if ($action === 'read') {
        $id = trim((string) ($_GET['id'] ?? ''));
        if (!$id) json_error('id obrigatorio', 400);

        $detail = google_http_get(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . urlencode($id) . '?format=full',
            $token
        );
        if (!empty($detail['error'])) json_error($detail['error']['message'] ?? 'Erro Gmail', 502);

        // Mark as read
        if (in_array('UNREAD', (array) ($detail['labelIds'] ?? []))) {
            google_http_post_json(
                'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . urlencode($id) . '/modify',
                ['removeLabelIds' => ['UNREAD']],
                $token
            );
        }

        $headers = $detail['payload']['headers'] ?? [];
        json_response([
            'id'       => $detail['id'],
            'threadId' => $detail['threadId'],
            'from'     => gmail_header($headers, 'From'),
            'to'       => gmail_header($headers, 'To'),
            'subject'  => gmail_header($headers, 'Subject'),
            'date'     => gmail_header($headers, 'Date'),
            'body'     => gmail_body($detail['payload'] ?? []),
            'labels'   => $detail['labelIds'] ?? [],
        ]);
    }

    json_error('Acao desconhecida', 400);
}

// ---------------------------------------------------------------------------
// POST — enviar e-mail
// ---------------------------------------------------------------------------

if ($method === 'POST') {
    $data    = json_input();
    $to      = trim((string) ($data['to']      ?? ''));
    $subject = trim((string) ($data['subject'] ?? ''));
    $body    = trim((string) ($data['body']    ?? ''));
    if (!$to || !$subject || !$body) json_error('to, subject e body sao obrigatorios', 422);

    // Codifica assunto em UTF-8 Q-encoding se necessário
    $subjEnc = mb_detect_encoding($subject, 'ASCII', true) ? $subject
             : '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $raw  = "To: {$to}\r\n";
    $raw .= "Subject: {$subjEnc}\r\n";
    $raw .= "Content-Type: text/plain; charset=utf-8\r\n";
    $raw .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $raw .= chunk_split(base64_encode($body));

    $encoded = rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');

    $payload = ['raw' => $encoded];
    if (!empty($data['threadId'])) $payload['threadId'] = $data['threadId'];

    $result = google_http_post_json(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        $payload,
        $token
    );
    if (!empty($result['error'])) json_error($result['error']['message'] ?? 'Erro ao enviar', 502);
    json_response(['id' => $result['id'] ?? null, 'sent' => true]);
}

// ---------------------------------------------------------------------------
// PATCH — ações (archive / trash / read / unread)
// ---------------------------------------------------------------------------

if ($method === 'PATCH') {
    $data   = json_input();
    $id     = trim((string) ($data['id']     ?? ''));
    $act    = trim((string) ($data['action'] ?? ''));
    if (!$id) json_error('id obrigatorio', 400);

    $labelsPayload = match ($act) {
        'archive' => ['removeLabelIds' => ['INBOX']],
        'trash'   => ['addLabelIds'    => ['TRASH'], 'removeLabelIds' => ['INBOX']],
        'read'    => ['removeLabelIds' => ['UNREAD']],
        'unread'  => ['addLabelIds'    => ['UNREAD']],
        default   => null,
    };
    if (!$labelsPayload) json_error('action invalida', 400);

    $result = google_http_post_json(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . urlencode($id) . '/modify',
        $labelsPayload,
        $token
    );
    if (!empty($result['error'])) json_error($result['error']['message'] ?? 'Erro', 502);
    json_response(['ok' => true]);
}

json_error('Metodo nao permitido', 405);
