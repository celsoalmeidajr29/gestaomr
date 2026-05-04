<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where = [];
    if (!empty($_GET['status'])) {
        $where[] = 'status = :status';
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['categoria'])) {
        $where[] = 'categoria = :categoria';
        $params[':categoria'] = $_GET['categoria'];
    }
    if (!empty($_GET['q'])) {
        $where[] = 'nome LIKE :q';
        $params[':q'] = '%' . $_GET['q'] . '%';
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $sql = "SELECT id, codigo_externo, nome, categoria, funcao, cpf, telefone, email,
                   salario_fixo, valor_diaria, tipo_pix, chave_pix,
                   data_admissao, data_demissao, status, criado_em
            FROM funcionarios {$whereClause}
            ORDER BY nome";
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
        'INSERT INTO funcionarios (codigo_externo, nome, categoria, funcao, cpf, rg,
         data_nascimento, estado_civil, nacionalidade, naturalidade, telefone, email,
         endereco, cep, cidade, uf, salario_fixo, valor_diaria,
         tipo_pix, chave_pix, data_admissao, data_demissao, notas, status)
         VALUES (:ce, :nome, :cat, :funcao, :cpf, :rg,
         :dn, :ec, :nac, :nat, :tel, :email,
         :end, :cep, :cidade, :uf, :sal, :diaria,
         :tipopix, :pix, :admissao, :demissao, :notas, :status)'
    );
    $stmt->execute([
        ':ce'      => $d['codigo_externo'] ?? null,
        ':nome'    => $d['nome'],
        ':cat'     => $d['categoria'] ?? 'Operacional',
        ':funcao'  => $d['funcao'] ?? null,
        ':cpf'     => $d['cpf'] ?? null,
        ':rg'      => $d['rg'] ?? null,
        ':dn'      => $d['data_nascimento'] ?? null,
        ':ec'      => $d['estado_civil'] ?? null,
        ':nac'     => $d['nacionalidade'] ?? 'Brasileira',
        ':nat'     => $d['naturalidade'] ?? null,
        ':tel'     => $d['telefone'] ?? null,
        ':email'   => $d['email'] ?? null,
        ':end'     => $d['endereco'] ?? null,
        ':cep'     => $d['cep'] ?? null,
        ':cidade'  => $d['cidade'] ?? null,
        ':uf'      => $d['uf'] ?? null,
        ':sal'     => $d['salario_fixo'] ?? 0,
        ':diaria'  => $d['valor_diaria'] ?? 0,
        ':tipopix' => $d['tipo_pix'] ?? 'CPF',
        ':pix'     => $d['chave_pix'] ?? null,
        ':admissao'=> $d['data_admissao'] ?? null,
        ':demissao'=> $d['data_demissao'] ?? null,
        ':notas'   => $d['notas'] ?? null,
        ':status'  => $d['status'] ?? 'ATIVO',
    ]);
    $id = (int) db()->lastInsertId();
    $row = db()->query("SELECT * FROM funcionarios WHERE id = {$id}")->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
