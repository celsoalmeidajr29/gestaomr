<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

$user = require_auth();
if ($user['perfil_codigo'] !== 'admin') {
    json_error('Acesso restrito a administradores', 403);
}
$method = $_SERVER['REQUEST_METHOD'];

// Detecta se migration 021 foi aplicada (coluna acesso_cerebro existe)
function hasCerebroCol(): bool
{
    static $has = null;
    if ($has !== null) return $has;
    $has = (bool) db()->query(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = 'usuarios'
            AND COLUMN_NAME  = 'acesso_cerebro'"
    )->fetchColumn();
    return $has;
}

if ($method === 'GET') {
    $cerebro = hasCerebroCol() ? ', u.acesso_cerebro' : '';
    $stmt = db()->query(
        "SELECT u.id, u.nome, u.email, u.telefone, u.status,
                u.acesso_mrsys, u.acesso_pareceto{$cerebro},
                u.perfil_id, p.codigo AS perfil_codigo, p.nome AS perfil_nome,
                u.ultimo_login, u.criado_em
         FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
         ORDER BY u.nome"
    );
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['nome', 'email', 'senha', 'perfil_id'] as $f) {
        if (empty($d[$f])) json_error("Campo obrigatório: {$f}", 422);
    }
    $hash = password_hash($d['senha'], PASSWORD_BCRYPT);

    if (hasCerebroCol()) {
        $sql = 'INSERT INTO usuarios (nome, email, senha_hash, perfil_id, telefone, status, acesso_mrsys, acesso_pareceto, acesso_cerebro)
                VALUES (:nome, :email, :hash, :perfil_id, :tel, :status, :mrsys, :pareceto, :cerebro)';
        $params = [
            ':nome'     => trim($d['nome']),
            ':email'    => trim($d['email']),
            ':hash'     => $hash,
            ':perfil_id'=> (int) $d['perfil_id'],
            ':tel'      => $d['telefone'] ?? null,
            ':status'   => $d['status'] ?? 'ATIVO',
            ':mrsys'    => isset($d['acesso_mrsys'])    ? (int)(bool)$d['acesso_mrsys']    : 1,
            ':pareceto' => isset($d['acesso_pareceto']) ? (int)(bool)$d['acesso_pareceto'] : 0,
            ':cerebro'  => isset($d['acesso_cerebro'])  ? (int)(bool)$d['acesso_cerebro']  : 0,
        ];
    } else {
        $sql = 'INSERT INTO usuarios (nome, email, senha_hash, perfil_id, telefone, status, acesso_mrsys, acesso_pareceto)
                VALUES (:nome, :email, :hash, :perfil_id, :tel, :status, :mrsys, :pareceto)';
        $params = [
            ':nome'     => trim($d['nome']),
            ':email'    => trim($d['email']),
            ':hash'     => $hash,
            ':perfil_id'=> (int) $d['perfil_id'],
            ':tel'      => $d['telefone'] ?? null,
            ':status'   => $d['status'] ?? 'ATIVO',
            ':mrsys'    => isset($d['acesso_mrsys'])    ? (int)(bool)$d['acesso_mrsys']    : 1,
            ':pareceto' => isset($d['acesso_pareceto']) ? (int)(bool)$d['acesso_pareceto'] : 0,
        ];
    }

    $stmt = db()->prepare($sql);
    try {
        $stmt->execute($params);
    } catch (\PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) json_error('E-mail já cadastrado', 409);
        throw $e;
    }

    $id      = (int) db()->lastInsertId();
    $cerebro = hasCerebroCol() ? ', u.acesso_cerebro' : '';
    $row = db()->query(
        "SELECT u.id, u.nome, u.email, u.status, u.acesso_mrsys, u.acesso_pareceto{$cerebro},
                u.perfil_id, p.codigo AS perfil_codigo, p.nome AS perfil_nome
         FROM usuarios u JOIN perfis p ON p.id = u.perfil_id WHERE u.id = {$id}"
    )->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
