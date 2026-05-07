<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('folhas');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = db()->query('SELECT * FROM folha_categorias ORDER BY nome');
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    $nome = strtoupper(trim((string)($d['nome'] ?? '')));
    if (!$nome) json_error('Campo obrigatório: nome', 422);
    $cor = $d['cor'] ?? null;

    $pdo = db();
    try {
        $stmt = $pdo->prepare('INSERT INTO folha_categorias (nome, cor) VALUES (:nome, :cor)');
        $stmt->execute([':nome' => $nome, ':cor' => $cor]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->query("SELECT * FROM folha_categorias WHERE id={$id}")->fetch();
        json_response($row, 201);
    } catch (PDOException $e) {
        if ((int) $e->getCode() === 23000) {
            json_error('Já existe uma categoria com esse nome', 409);
        }
        throw $e;
    }
}

json_error('Método não permitido', 405);
