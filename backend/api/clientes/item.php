<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('clientes');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

if ($method === 'GET') {
    $row = db()->query("SELECT * FROM clientes WHERE id = {$id}")->fetch();
    if (!$row) {
        json_error('Cliente não encontrado', 404);
    }
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    if (empty($d['nome'])) {
        json_error('Campo obrigatório: nome', 422);
    }
    $stmt = db()->prepare(
        'UPDATE clientes SET nome=:nome, razao_social=:razao_social, cnpj=:cnpj,
         inscricao_estadual=:ie, aliquota=:aliquota,
         endereco=:endereco, numero=:numero, complemento=:complemento, bairro=:bairro,
         cep=:cep, cidade=:cidade, uf=:uf,
         contato_nome=:contato_nome, cargo_contato=:cargo_contato,
         contato_email=:contato_email, contato_telefone=:contato_telefone,
         observacoes=:observacoes, status=:status
         WHERE id=:id'
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
        ':id'               => $id,
    ]);
    $row = db()->query("SELECT * FROM clientes WHERE id = {$id}")->fetch();
    json_response($row);
}

if ($method === 'DELETE') {
    $stmt = db()->prepare("UPDATE clientes SET status='INATIVO' WHERE id=:id");
    $stmt->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'INATIVO']);
}

json_error('Método não permitido', 405);
