<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = db()->query('SELECT * FROM pc_metas ORDER BY mes DESC, funcionario_nome ASC');
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    if (empty($d['funcionario_nome'])) json_error('funcionario_nome obrigatorio', 422);
    if (empty($d['mes']))              json_error('mes obrigatorio', 422);

    $stmt = db()->prepare(
        'INSERT INTO pc_metas (funcionario_nome, mes, meta_trans, meta_valor)
         VALUES (:nome, :mes, :mt, :mv)
         ON DUPLICATE KEY UPDATE meta_trans = :mt2, meta_valor = :mv2, atualizado_em = NOW()'
    );
    $stmt->execute([
        ':nome' => trim($d['funcionario_nome']),
        ':mes'  => $d['mes'],
        ':mt'   => (int)($d['meta_trans'] ?? 0),
        ':mv'   => round((float)($d['meta_valor'] ?? 0), 2),
        ':mt2'  => (int)($d['meta_trans'] ?? 0),
        ':mv2'  => round((float)($d['meta_valor'] ?? 0), 2),
    ]);
    $id = db()->lastInsertId() ?: db()->query("SELECT id FROM pc_metas WHERE funcionario_nome = " . db()->quote(trim($d['funcionario_nome'])) . " AND mes = " . db()->quote($d['mes']))->fetchColumn();
    $row = db()->query("SELECT * FROM pc_metas WHERE id = $id")->fetch();
    json_response($row, 201);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_error('id obrigatorio', 422);
    $d = json_input();
    db()->prepare('UPDATE pc_metas SET funcionario_nome=:nome, mes=:mes, meta_trans=:mt, meta_valor=:mv WHERE id=:id')
        ->execute([
            ':nome' => trim($d['funcionario_nome'] ?? ''),
            ':mes'  => $d['mes'] ?? '',
            ':mt'   => (int)($d['meta_trans'] ?? 0),
            ':mv'   => round((float)($d['meta_valor'] ?? 0), 2),
            ':id'   => $id,
        ]);
    $row = db()->query("SELECT * FROM pc_metas WHERE id = $id")->fetch();
    json_response($row ?: ['ok' => true]);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_error('id obrigatorio', 422);
    db()->prepare('DELETE FROM pc_metas WHERE id = :id')->execute([':id' => $id]);
    json_response(['ok' => true]);
}

json_error('Metodo nao permitido', 405);
