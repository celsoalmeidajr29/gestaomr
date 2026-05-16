<?php
/**
 * MRSys — Mensagens pré-definidas para propostas comerciais
 *
 * GET    /api/propostas/mensagens.php          → lista todas (ou ?tipo=objeto|faturamento|prazo|observacao)
 * POST   /api/propostas/mensagens.php          → cria mensagem { tipo, titulo, conteudo }
 * PUT    /api/propostas/mensagens.php?id=N     → edita { titulo?, conteudo?, ativo? }
 * DELETE /api/propostas/mensagens.php?id=N     → remove (hard delete)
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

$user   = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

// ── GET ───────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $tipo = isset($_GET['tipo']) ? trim($_GET['tipo']) : null;
    $tiposValidos = ['objeto', 'faturamento', 'prazo', 'observacao'];

    if ($tipo && !in_array($tipo, $tiposValidos, true)) {
        json_error('Tipo inválido', 422);
    }

    if ($tipo) {
        $rows = db()->prepare('SELECT id, tipo, titulo, conteudo, ativo FROM proposta_mensagens_padrao WHERE tipo = :tipo AND ativo = 1 ORDER BY id ASC');
        $rows->execute([':tipo' => $tipo]);
    } else {
        $rows = db()->prepare('SELECT id, tipo, titulo, conteudo, ativo FROM proposta_mensagens_padrao WHERE ativo = 1 ORDER BY tipo, id ASC');
        $rows->execute();
    }

    json_response($rows->fetchAll(PDO::FETCH_ASSOC));
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    require_permission('propostas', $user);
    $d = json_input();
    $tipo     = trim((string)($d['tipo']     ?? ''));
    $titulo   = trim((string)($d['titulo']   ?? ''));
    $conteudo = trim((string)($d['conteudo'] ?? ''));

    $tiposValidos = ['objeto', 'faturamento', 'prazo', 'observacao'];
    if (!in_array($tipo, $tiposValidos, true)) json_error('Tipo inválido', 422);
    if (!$titulo)   json_error('Título obrigatório', 422);
    if (!$conteudo) json_error('Conteúdo obrigatório', 422);

    $stmt = db()->prepare('INSERT INTO proposta_mensagens_padrao (tipo, titulo, conteudo) VALUES (:tipo, :titulo, :conteudo)');
    $stmt->execute([':tipo' => $tipo, ':titulo' => $titulo, ':conteudo' => $conteudo]);
    $newId = (int) db()->lastInsertId();

    json_response(['id' => $newId, 'tipo' => $tipo, 'titulo' => $titulo, 'conteudo' => $conteudo, 'ativo' => 1], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    require_permission('propostas', $user);
    if (!$id) json_error('id obrigatório', 400);
    $d = json_input();

    $sets = []; $params = [':id' => $id];
    if (isset($d['titulo']))   { $sets[] = 'titulo = :titulo';     $params[':titulo']   = trim((string)$d['titulo']); }
    if (isset($d['conteudo'])) { $sets[] = 'conteudo = :conteudo'; $params[':conteudo'] = trim((string)$d['conteudo']); }
    if (isset($d['ativo']))    { $sets[] = 'ativo = :ativo';       $params[':ativo']    = (int)(bool)$d['ativo']; }
    if (!$sets) json_error('Nenhum campo para atualizar', 422);

    db()->prepare('UPDATE proposta_mensagens_padrao SET ' . implode(', ', $sets) . ' WHERE id = :id')
        ->execute($params);

    json_response(['ok' => true]);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    require_permission('propostas', $user);
    if (!$id) json_error('id obrigatório', 400);
    db()->prepare('DELETE FROM proposta_mensagens_padrao WHERE id = :id')->execute([':id' => $id]);
    json_response(['ok' => true]);
}

json_error('Método não permitido', 405);
