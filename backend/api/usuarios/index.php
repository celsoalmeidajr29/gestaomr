<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

$user = require_auth();
if ($user['perfil_codigo'] !== 'admin') {
    json_error('Acesso restrito a administradores', 403);
}
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = db()->query(
        "SELECT u.id, u.nome, u.email, u.telefone, u.avatar_url, u.status,
                u.perfil_id, p.codigo AS perfil_codigo, p.nome AS perfil_nome,
                u.ultimo_login, u.criado_em
         FROM usuarios u JOIN perfis p ON p.id=u.perfil_id
         ORDER BY u.nome"
    );
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['nome', 'email', 'senha', 'perfil_id'] as $f) {
        if (empty($d[$f])) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    $hash = password_hash($d['senha'], PASSWORD_BCRYPT);
    $stmt = db()->prepare(
        'INSERT INTO usuarios (nome, email, senha_hash, perfil_id, telefone, status)
         VALUES (:nome, :email, :hash, :perfil_id, :tel, :status)'
    );
    $stmt->execute([
        ':nome'      => $d['nome'],
        ':email'     => $d['email'],
        ':hash'      => $hash,
        ':perfil_id' => (int) $d['perfil_id'],
        ':tel'       => $d['telefone'] ?? null,
        ':status'    => $d['status'] ?? 'ATIVO',
    ]);
    $id = (int) db()->lastInsertId();
    $row = db()->query(
        "SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.codigo AS perfil_codigo
         FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.id={$id}"
    )->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
