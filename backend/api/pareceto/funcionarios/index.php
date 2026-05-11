<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $where  = [];
    $params = [];
    if (!empty($_GET['status']) && $_GET['status'] !== 'todos') {
        $where[] = 'status = :status';
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['cargo'])) {
        $where[] = 'cargo = :cargo';
        $params[':cargo'] = $_GET['cargo'];
    }
    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = db()->prepare("SELECT * FROM pc_funcionarios {$wc} ORDER BY nome ASC");
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['nome', 'login', 'cargo'] as $f) {
        if (empty($d[$f])) json_error("Campo obrigatório: {$f}", 422);
    }
    $cargo  = $d['cargo'];
    $cargos = ['Supervisor', 'Fiscal', 'Operador'];
    if (!in_array($cargo, $cargos, true)) json_error('Cargo inválido', 422);

    $stmt = db()->prepare(
        'INSERT INTO pc_funcionarios (nome, login, cargo, status)
         VALUES (:nome, :login, :cargo, :status)'
    );
    try {
        $stmt->execute([
            ':nome'   => trim($d['nome']),
            ':login'  => trim($d['login']),
            ':cargo'  => $cargo,
            ':status' => $d['status'] ?? 'Ativo',
        ]);
    } catch (\PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) {
            json_error('Login já cadastrado', 409);
        }
        throw $e;
    }
    $id  = (int) db()->lastInsertId();
    $row = db()->query("SELECT * FROM pc_funcionarios WHERE id = {$id}")->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
