<?php
/**
 * Proxy para a Notion API v1.
 * Requer NOTION_API_KEY no .env (Integration Token).
 *
 * GET  ?action=search[&q=texto]           → lista páginas/databases recentes ou pesquisa
 * GET  ?action=page&id=PAGE_ID            → blocos da página (children recursivo 1 nível)
 * POST ?action=append&id=PAGE_ID          → appenda bloco parágrafo { text: "..." }
 * PATCH ?action=update&id=BLOCK_ID        → atualiza texto de um bloco { text: "..." }
 * POST ?action=create                     → cria nova página { title, parent_id? }
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('cerebro');

$NOTION_KEY = env('NOTION_API_KEY', '');
if (!$NOTION_KEY) json_error('NOTION_API_KEY não configurado no .env', 503);

$NOTION_VERSION = '2022-06-28';
$method = $_SERVER['REQUEST_METHOD'];
$action = trim((string) ($_GET['action'] ?? 'search'));

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function notion_get(string $url, string $key, string $version): array
{
    $ctx = stream_context_create(['http' => [
        'method'        => 'GET',
        'header'        => "Authorization: Bearer {$key}\r\n" .
                           "Notion-Version: {$version}\r\n",
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $r = @file_get_contents($url, false, $ctx);
    return $r !== false ? (json_decode($r, true) ?? []) : ['error' => 'connection_error'];
}

function notion_post(string $url, array $data, string $key, string $version): array
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Authorization: Bearer {$key}\r\n" .
                           "Notion-Version: {$version}\r\n" .
                           "Content-Type: application/json; charset=utf-8\r\n" .
                           'Content-Length: ' . strlen($json) . "\r\n",
        'content'       => $json,
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $r = @file_get_contents($url, false, $ctx);
    return $r !== false ? (json_decode($r, true) ?? []) : ['error' => 'connection_error'];
}

function notion_patch(string $url, array $data, string $key, string $version): array
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    $ctx = stream_context_create(['http' => [
        'method'        => 'PATCH',
        'header'        => "Authorization: Bearer {$key}\r\n" .
                           "Notion-Version: {$version}\r\n" .
                           "Content-Type: application/json; charset=utf-8\r\n" .
                           'Content-Length: ' . strlen($json) . "\r\n",
        'content'       => $json,
        'ignore_errors' => true,
        'timeout'       => 15,
    ]]);
    $r = @file_get_contents($url, false, $ctx);
    return $r !== false ? (json_decode($r, true) ?? []) : ['error' => 'connection_error'];
}

// ---------------------------------------------------------------------------
// Helpers de modelo
// ---------------------------------------------------------------------------

/** Converte rich_text Notion em texto puro com anotações preservadas. */
function notion_rich_text(array $rich): string
{
    $out = '';
    foreach ($rich as $t) {
        $text  = (string) ($t['text']['content'] ?? $t['plain_text'] ?? '');
        $ann   = $t['annotations'] ?? [];
        if (!empty($ann['code']))          $text = '`' . $text . '`';
        if (!empty($ann['bold']))          $text = '**' . $text . '**';
        if (!empty($ann['italic']))        $text = '*' . $text . '*';
        if (!empty($ann['strikethrough'])) $text = '~~' . $text . '~~';
        if (!empty($t['text']['link']))    $text = '[' . $text . '](' . ($t['text']['link']['url'] ?? '#') . ')';
        $out .= $text;
    }
    return $out;
}

/** Converte um bloco Notion em HTML simples. */
function notion_block_html(array $b): string
{
    $type = (string) ($b['type'] ?? '');
    $inner = $b[$type] ?? [];
    $rt    = notion_rich_text($inner['rich_text'] ?? []);
    $color = (string) ($inner['color'] ?? 'default');
    $style = $color !== 'default' ? " data-notion-color=\"{$color}\"" : '';
    $id    = htmlspecialchars((string) ($b['id'] ?? ''), ENT_QUOTES, 'UTF-8');
    $attrs = " data-block-id=\"{$id}\" data-block-type=\"{$type}\"";

    return match ($type) {
        'heading_1'            => "<h1{$attrs}{$style}>{$rt}</h1>",
        'heading_2'            => "<h2{$attrs}{$style}>{$rt}</h2>",
        'heading_3'            => "<h3{$attrs}{$style}>{$rt}</h3>",
        'paragraph'            => "<p{$attrs}{$style}>{$rt}</p>",
        'bulleted_list_item'   => "<li{$attrs}{$style}>{$rt}</li>",
        'numbered_list_item'   => "<li{$attrs}{$style}>{$rt}</li>",
        'to_do'                => sprintf(
            '<div%s%s class="notion-todo"><input type="checkbox"%s disabled> %s</div>',
            $attrs, $style,
            !empty($inner['checked']) ? ' checked' : '',
            $rt
        ),
        'quote'                => "<blockquote{$attrs}{$style}>{$rt}</blockquote>",
        'code'                 => sprintf('<pre%s%s><code>%s</code></pre>', $attrs, $style, htmlspecialchars($rt, ENT_QUOTES, 'UTF-8')),
        'divider'              => "<hr{$attrs} />",
        'callout'              => sprintf('<div%s%s class="notion-callout">%s %s</div>', $attrs, $style, $inner['icon']['emoji'] ?? '💡', $rt),
        'image'                => notion_image_html($b, $attrs),
        'child_page'           => sprintf('<a%s%s class="notion-child-page" href="#" data-page-id="%s">📄 %s</a>', $attrs, $style, htmlspecialchars((string)($b['id'] ?? ''), ENT_QUOTES, 'UTF-8'), htmlspecialchars((string)($inner['title'] ?? ''), ENT_QUOTES, 'UTF-8')),
        'table_of_contents'    => '',
        'breadcrumb'           => '',
        default                => $rt ? "<p{$attrs}{$style}>{$rt}</p>" : '',
    };
}

function notion_image_html(array $b, string $attrs): string
{
    $img   = $b['image'] ?? [];
    $url   = $img['type'] === 'file' ? ($img['file']['url'] ?? '') : ($img['external']['url'] ?? '');
    $cap   = notion_rich_text($img['caption'] ?? []);
    if (!$url) return '';
    return sprintf('<figure%s><img src="%s" alt="%s" loading="lazy" style="max-width:100%%;border-radius:6px" /><figcaption>%s</figcaption></figure>',
        $attrs, htmlspecialchars($url, ENT_QUOTES, 'UTF-8'), htmlspecialchars($cap, ENT_QUOTES, 'UTF-8'), $cap);
}

/** Extrai título de uma página Notion. */
function notion_page_title(array $page): string
{
    $props = $page['properties'] ?? [];
    foreach ($props as $prop) {
        if (($prop['type'] ?? '') === 'title') {
            return notion_rich_text($prop['title'] ?? []);
        }
    }
    return $page['title'] ?? '(sem título)';
}

/** Converte bloco em texto plano para edição. */
function notion_block_plain(array $b): string
{
    $type  = (string) ($b['type'] ?? '');
    $inner = $b[$type] ?? [];
    return notion_rich_text($inner['rich_text'] ?? []);
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

if ($method === 'GET') {

    if ($action === 'search') {
        $q = trim((string) ($_GET['q'] ?? ''));
        $payload = ['page_size' => 30, 'filter' => ['value' => 'page', 'property' => 'object']];
        if ($q !== '') $payload['query'] = $q;
        $res = notion_post('https://api.notion.com/v1/search', $payload, $NOTION_KEY, $NOTION_VERSION);
        if (!empty($res['error']) || isset($res['status'])) {
            $msg = $res['message'] ?? ($res['error'] ?? 'Erro Notion');
            json_error($msg, (int)($res['status'] ?? 502));
        }
        $pages = array_map(function ($p) {
            return [
                'id'           => $p['id'],
                'title'        => notion_page_title($p),
                'url'          => $p['url'] ?? null,
                'icon'         => $p['icon']['emoji'] ?? null,
                'lastEdited'   => $p['last_edited_time'] ?? null,
                'parentType'   => $p['parent']['type'] ?? null,
            ];
        }, $res['results'] ?? []);
        json_response($pages);
    }

    if ($action === 'page') {
        $id = trim((string) ($_GET['id'] ?? ''));
        if (!$id) json_error('id obrigatório', 400);

        // Metadados da página
        $meta = notion_get("https://api.notion.com/v1/pages/{$id}", $NOTION_KEY, $NOTION_VERSION);
        if (!empty($meta['status'])) json_error($meta['message'] ?? 'Página não encontrada', (int)$meta['status']);

        // Blocos (children)
        $blocks_res = notion_get("https://api.notion.com/v1/blocks/{$id}/children?page_size=100", $NOTION_KEY, $NOTION_VERSION);
        $rawBlocks  = $blocks_res['results'] ?? [];

        $htmlBlocks = [];
        $listType   = null;
        foreach ($rawBlocks as $b) {
            $t = (string) ($b['type'] ?? '');
            $isList = in_array($t, ['bulleted_list_item', 'numbered_list_item']);
            $isOl   = $t === 'numbered_list_item';
            if (!$isList && $listType !== null) {
                array_push($htmlBlocks, $listType === 'ol' ? '</ol>' : '</ul>'); $listType = null;
            }
            if ($isList) {
                if ($listType === null) {
                    array_push($htmlBlocks, $isOl ? '<ol>' : '<ul>'); $listType = $isOl ? 'ol' : 'ul';
                }
            }
            $h = notion_block_html($b);
            if ($h !== '') $htmlBlocks[] = $h;
        }
        if ($listType !== null) $htmlBlocks[] = $listType === 'ol' ? '</ol>' : '</ul>';

        // Blocos editáveis (para inline edit)
        $editableBlocks = array_values(array_map(function ($b) {
            return [
                'id'   => $b['id'],
                'type' => $b['type'],
                'text' => notion_block_plain($b),
            ];
        }, array_filter($rawBlocks, function ($b) {
            return in_array($b['type'] ?? '', [
                'paragraph','heading_1','heading_2','heading_3',
                'bulleted_list_item','numbered_list_item','to_do','quote',
            ]);
        })));

        json_response([
            'id'       => $meta['id'],
            'title'    => notion_page_title($meta),
            'icon'     => $meta['icon']['emoji'] ?? null,
            'url'      => $meta['url'] ?? null,
            'lastEdited' => $meta['last_edited_time'] ?? null,
            'html'     => implode("\n", $htmlBlocks),
            'editable' => $editableBlocks,
        ]);
    }

    json_error('Ação desconhecida', 400);
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

if ($method === 'POST') {
    $data = json_input();

    if ($action === 'append') {
        $id   = trim((string) ($_GET['id'] ?? $data['id'] ?? ''));
        $text = trim((string) ($data['text'] ?? ''));
        if (!$id)   json_error('id obrigatório', 400);
        if (!$text) json_error('text obrigatório', 400);

        $block = ['object' => 'block', 'type' => 'paragraph',
            'paragraph' => ['rich_text' => [['type' => 'text', 'text' => ['content' => $text]]]]];
        $res = notion_patch("https://api.notion.com/v1/blocks/{$id}/children",
            ['children' => [$block]], $NOTION_KEY, $NOTION_VERSION);
        if (!empty($res['status'])) json_error($res['message'] ?? 'Erro ao adicionar bloco', (int)$res['status']);
        json_response(['ok' => true]);
    }

    if ($action === 'create') {
        $title     = trim((string) ($data['title'] ?? ''));
        $parentId  = trim((string) ($data['parent_id'] ?? ''));
        if (!$title) json_error('title obrigatório', 400);

        $payload = [
            'parent' => $parentId
                ? ['type' => 'page_id', 'page_id' => $parentId]
                : ['type' => 'workspace', 'workspace' => true],
            'properties' => [
                'title' => ['title' => [['type' => 'text', 'text' => ['content' => $title]]]]
            ],
        ];
        $res = notion_post('https://api.notion.com/v1/pages', $payload, $NOTION_KEY, $NOTION_VERSION);
        if (!empty($res['status'])) json_error($res['message'] ?? 'Erro ao criar página', (int)$res['status']);
        json_response(['id' => $res['id'], 'url' => $res['url'] ?? null]);
    }

    json_error('Ação desconhecida no POST', 400);
}

// ---------------------------------------------------------------------------
// PATCH — atualiza texto de um bloco
// ---------------------------------------------------------------------------

if ($method === 'PATCH') {
    $data = json_input();
    $id   = trim((string) ($_GET['id'] ?? $data['id'] ?? ''));
    $text = (string) ($data['text'] ?? '');
    $type = trim((string) ($data['type'] ?? 'paragraph'));
    if (!$id) json_error('id obrigatório', 400);

    $allowed = ['paragraph','heading_1','heading_2','heading_3',
                'bulleted_list_item','numbered_list_item','to_do','quote'];
    if (!in_array($type, $allowed)) $type = 'paragraph';

    $payload = [
        $type => ['rich_text' => [['type' => 'text', 'text' => ['content' => $text]]]]
    ];
    $res = notion_patch("https://api.notion.com/v1/blocks/{$id}",
        $payload, $NOTION_KEY, $NOTION_VERSION);
    if (!empty($res['status'])) json_error($res['message'] ?? 'Erro ao atualizar bloco', (int)$res['status']);
    json_response(['ok' => true]);
}

json_error('Método não permitido', 405);
