<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

// Usuário pode ver/editar a si mesmo; admin pode acessar qualquer um
$isSelf = $user['id'] === $id;
$isAdmin = $user['perfil_codigo'] === 'admin';
if (!$isSelf && !$isAdmin) {
    json_error('Acesso não autorizado', 403);
}

if ($method === 'GET') {
    $row = db()->query(
        "SELECT u.id, u.nome, u.email, u.telefone, u.avatar_url, u.status,
                u.perfil_id, p.codigo AS perfil_codigo, p.nome AS perfil_nome,
                p.permissoes, u.ultimo_login, u.criado_em
         FROM usuarios u JOIN perfis p ON p.id=u.perfil_id
         WHERE u.id={$id}"
    )->fetch();
    if (!$row) {
        json_error('Usuário não encontrado', 404);
    }
    $row['permissoes'] = json_decode($row['permissoes'], true) ?: [];
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $updates = [];
    $params = [':id' => $id];

    if (!empty($d['nome'])) {
        $updates[] = 'nome=:nome';
        $params[':nome'] = $d['nome'];
    }
    if (!empty($d['telefone'])) {
        $updates[] = 'telefone=:tel';
        $params[':tel'] = $d['telefone'];
    }
    if (!empty($d['senha'])) {
        $updates[] = 'senha_hash=:hash';
        $params[':hash'] = password_hash($d['senha'], PASSWORD_BCRYPT);
    }
    // Apenas admin pode mudar perfil e status
    if ($isAdmin) {
        if (!empty($d['perfil_id'])) {
            $updates[] = 'perfil_id=:perfil_id';
            $params[':perfil_id'] = (int) $d['perfil_id'];
        }
        if (!empty($d['status'])) {
            $updates[] = 'status=:status';
            $params[':status'] = $d['status'];
        }
    }
    if ($updates) {
        $sql = 'UPDATE usuarios SET ' . implode(', ', $updates) . ' WHERE id=:id';
        db()->prepare($sql)->execute($params);
    }
    $row = db()->query(
        "SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.codigo AS perfil_codigo
         FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.id={$id}"
    )->fetch();
    json_response($row);
}

if ($method === 'DELETE') {
    if (!$isAdmin) {
        json_error('Apenas administradores podem excluir usuários', 403);
    }
    if ($isSelf) {
        json_error('Não é possível excluir o próprio usuário', 400);
    }
    $stmt = db()->prepare("UPDATE usuarios SET status='INATIVO' WHERE id=:id");
    $stmt->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'INATIVO']);
}

json_error('Método não permitido', 405);
