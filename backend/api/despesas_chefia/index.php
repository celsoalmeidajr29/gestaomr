<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('despesas');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where  = [];
    if (!empty($_GET['competencia'])) {
        $where[] = 'competencia = :competencia';
        $params[':competencia'] = $_GET['competencia'];
    }
    if (!empty($_GET['status']) && $_GET['status'] !== 'todos') {
        $where[] = 'status = :status';
        $params[':status'] = $_GET['status'];
    } elseif (empty($_GET['status'])) {
        $where[] = "status != 'cancelado'";
    }
    if (!empty($_GET['origem'])) {
        $where[] = 'origem = :origem';
        $params[':origem'] = $_GET['origem'];
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $stmt = db()->prepare(
        "SELECT * FROM despesas_chefia {$whereClause}
         ORDER BY competencia DESC, data_lancamento DESC, id DESC"
    );
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d    = json_input();
    $user = current_user();
    foreach (['descricao', 'competencia', 'valor'] as $f) {
        if (empty($d[$f]) && $d[$f] !== 0) json_error("Campo obrigatório: {$f}", 422);
    }
    $origem = strtoupper(trim($d['origem'] ?? 'MANHÃES'));
    if (!in_array($origem, ['MANHÃES', 'RICARDO'], true)) $origem = 'MANHÃES';

    $stmt = db()->prepare(
        'INSERT INTO despesas_chefia
         (descricao, competencia, tipo, valor, origem, data_lancamento, data_pagamento,
          parcela_atual, parcela_total, status, observacoes, criado_por)
         VALUES (:desc, :comp, :tipo, :valor, :origem, :dl, :dp, :pa, :pt, :status, :obs, :uid)'
    );
    $stmt->execute([
        ':desc'   => $d['descricao'],
        ':comp'   => $d['competencia'],
        ':tipo'   => $d['tipo'] ?? 'AVULSA',
        ':valor'  => $d['valor'],
        ':origem' => $origem,
        ':dl'     => $d['data_lancamento'] ?? null,
        ':dp'     => $d['data_pagamento'] ?? null,
        ':pa'     => $d['parcela_atual'] ?? null,
        ':pt'     => $d['parcela_total'] ?? null,
        ':status' => $d['status'] ?? 'pendente',
        ':obs'    => $d['observacoes'] ?? null,
        ':uid'    => $user['id'],
    ]);
    $id  = (int) db()->lastInsertId();
    $row = db()->query("SELECT * FROM despesas_chefia WHERE id = {$id}")->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
