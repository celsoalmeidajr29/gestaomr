<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('descontos');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where = [];
    if (!empty($_GET['competencia'])) {
        $where[] = 'competencia = :competencia';
        $params[':competencia'] = $_GET['competencia'];
    }
    if (!empty($_GET['funcionario_id'])) {
        $where[] = 'funcionario_id = :fid';
        $params[':fid'] = (int) $_GET['funcionario_id'];
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $stmt = db()->prepare(
        "SELECT d.*, f.nome AS funcionario_nome
         FROM descontos d
         LEFT JOIN funcionarios f ON f.id = d.funcionario_id
         {$whereClause}
         ORDER BY d.competencia DESC, d.data DESC, d.id DESC"
    );
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['alvo_nome', 'competencia', 'valor'] as $f) {
        if (empty($d[$f]) && $d[$f] !== 0) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    $user = current_user();
    $stmt = db()->prepare(
        'INSERT INTO descontos (funcionario_id, alvo_nome, competencia, tipo_vale, valor,
         centro_custo, forma_pagamento, data, observacoes, criado_por)
         VALUES (:fid, :alvo, :comp, :tipo, :valor,
         :cc, :forma, :data, :obs, :criado_por)'
    );
    $stmt->execute([
        ':fid'       => $d['funcionario_id'] ?? null,
        ':alvo'      => $d['alvo_nome'],
        ':comp'      => $d['competencia'],
        ':tipo'      => $d['tipo_vale'] ?? 'VALE',
        ':valor'     => $d['valor'],
        ':cc'        => $d['centro_custo'] ?? null,
        ':forma'     => $d['forma_pagamento'] ?? null,
        ':data'      => $d['data'] ?? null,
        ':obs'       => $d['observacoes'] ?? null,
        ':criado_por'=> $user['id'],
    ]);
    $id = (int) db()->lastInsertId();
    $row = db()->query("SELECT * FROM descontos WHERE id = {$id}")->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
