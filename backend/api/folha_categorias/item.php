<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('folhas');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) json_error('Parâmetro id obrigatório', 400);

if ($method === 'GET') {
    $row = db()->query("SELECT * FROM folha_categorias WHERE id={$id}")->fetch();
    if (!$row) json_error('Categoria não encontrada', 404);
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $nome = strtoupper(trim((string)($d['nome'] ?? '')));
    if (!$nome) json_error('Campo obrigatório: nome', 422);
    $cor = $d['cor'] ?? null;
    try {
        $stmt = db()->prepare('UPDATE folha_categorias SET nome=:nome, cor=:cor WHERE id=:id');
        $stmt->execute([':nome' => $nome, ':cor' => $cor, ':id' => $id]);
        $row = db()->query("SELECT * FROM folha_categorias WHERE id={$id}")->fetch();
        json_response($row);
    } catch (PDOException $e) {
        if ((int) $e->getCode() === 23000) {
            json_error('Já existe outra categoria com esse nome', 409);
        }
        throw $e;
    }
}

if ($method === 'DELETE') {
    db()->prepare('DELETE FROM folha_categorias WHERE id=:id')->execute([':id' => $id]);
    json_response(['deleted' => $id]);
}

json_error('Método não permitido', 405);
