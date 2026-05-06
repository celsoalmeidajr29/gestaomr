<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('clientes');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $status = $_GET['status'] ?? null;
    $sql = 'SELECT * FROM clientes';
    $params = [];
    if ($status) {
        $sql .= ' WHERE status = :status';
        $params[':status'] = $status;
    }
    $sql .= ' ORDER BY nome';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    if (empty($d['nome'])) {
        json_error('Campo obrigatório: nome', 422);
    }
    $stmt = db()->prepare(
        'INSERT INTO clientes (nome, razao_social, cnpj, inscricao_estadual, aliquota,
         endereco, numero, complemento, bairro, cep, cidade, uf,
         contato_nome, cargo_contato, contato_email, contato_telefone, observacoes, status)
         VALUES (:nome, :razao_social, :cnpj, :ie, :aliquota,
         :endereco, :numero, :complemento, :bairro, :cep, :cidade, :uf,
         :contato_nome, :cargo_contato, :contato_email, :contato_telefone, :observacoes, :status)'
    );
    $stmt->execute([
        ':nome'             => $d['nome'],
        ':razao_social'     => $d['razao_social'] ?? null,
        ':cnpj'             => $d['cnpj'] ?? null,
        ':ie'               => $d['inscricao_estadual'] ?? null,
        ':aliquota'         => $d['aliquota'] ?? 0.00,
        ':endereco'         => $d['endereco'] ?? null,
        ':numero'           => $d['numero'] ?? null,
        ':complemento'      => $d['complemento'] ?? null,
        ':bairro'           => $d['bairro'] ?? null,
        ':cep'              => $d['cep'] ?? null,
        ':cidade'           => $d['cidade'] ?? null,
        ':uf'               => $d['uf'] ?? null,
        ':contato_nome'     => $d['contato_nome'] ?? null,
        ':cargo_contato'    => $d['cargo_contato'] ?? null,
        ':contato_email'    => $d['contato_email'] ?? null,
        ':contato_telefone' => $d['contato_telefone'] ?? null,
        ':observacoes'      => $d['observacoes'] ?? null,
        ':status'           => $d['status'] ?? 'ATIVO',
    ]);
    $id = (int) db()->lastInsertId();
    $row = db()->query("SELECT * FROM clientes WHERE id = {$id}")->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
