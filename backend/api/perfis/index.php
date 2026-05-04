<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = db()->query(
        'SELECT id, codigo, nome, descricao, permissoes, criado_em FROM perfis ORDER BY id'
    )->fetchAll();
    foreach ($rows as &$row) {
        $row['permissoes'] = json_decode($row['permissoes'], true) ?: [];
    }
    unset($row);
    json_response($rows);
}

if ($method === 'PUT' || $method === 'PATCH') {
    if ($user['perfil_codigo'] !== 'admin') {
        json_error('Acesso restrito a administradores', 403);
    }
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        json_error('Parâmetro id obrigatório', 400);
    }
    $d = json_input();
    $stmt = db()->prepare(
        'UPDATE perfis SET nome=:nome, descricao=:desc, permissoes=:perm WHERE id=:id'
    );
    $stmt->execute([
        ':nome' => $d['nome'],
        ':desc' => $d['descricao'] ?? null,
        ':perm' => json_encode($d['permissoes'] ?? []),
        ':id'   => $id,
    ]);
    $row = db()->query("SELECT * FROM perfis WHERE id={$id}")->fetch();
    $row['permissoes'] = json_decode($row['permissoes'], true) ?: [];
    json_response($row);
}

json_error('Método não permitido', 405);
