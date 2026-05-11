<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

$id = (int) ($_GET['id'] ?? 0);
if (!$id) json_error('ID inválido', 400);

if ($method === 'GET') {
    $row = db()->query("SELECT * FROM pc_funcionarios WHERE id = {$id}")->fetch();
    if (!$row) json_error('Não encontrado', 404);
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    foreach (['nome', 'login', 'cargo'] as $f) {
        if (empty($d[$f])) json_error("Campo obrigatório: {$f}", 422);
    }
    $cargo  = $d['cargo'];
    $cargos = ['Supervisor', 'Fiscal', 'Operador'];
    if (!in_array($cargo, $cargos, true)) json_error('Cargo inválido', 422);

    $stmt = db()->prepare(
        'UPDATE pc_funcionarios SET nome=:nome, login=:login, cargo=:cargo, status=:status
         WHERE id=:id'
    );
    try {
        $stmt->execute([
            ':nome'   => trim($d['nome']),
            ':login'  => trim($d['login']),
            ':cargo'  => $cargo,
            ':status' => $d['status'] ?? 'Ativo',
            ':id'     => $id,
        ]);
    } catch (\PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) {
            json_error('Login já cadastrado para outro funcionário', 409);
        }
        throw $e;
    }
    $row = db()->query("SELECT * FROM pc_funcionarios WHERE id = {$id}")->fetch();
    json_response($row);
}

if ($method === 'DELETE') {
    db()->prepare("UPDATE pc_funcionarios SET status='Inativo' WHERE id=:id")->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'Inativo']);
}

json_error('Método não permitido', 405);
