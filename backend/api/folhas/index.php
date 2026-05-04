<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where = [];
    if (!empty($_GET['competencia'])) {
        $where[] = 'fo.competencia = :competencia';
        $params[':competencia'] = $_GET['competencia'];
    }
    if (!empty($_GET['funcionario_id'])) {
        $where[] = 'fo.funcionario_id = :fid';
        $params[':fid'] = (int) $_GET['funcionario_id'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 'fo.status = :status';
        $params[':status'] = $_GET['status'];
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $stmt = db()->prepare(
        "SELECT fo.*, f.nome AS funcionario_nome, f.categoria AS funcionario_categoria
         FROM folhas fo
         JOIN funcionarios f ON f.id = fo.funcionario_id
         {$whereClause}
         ORDER BY fo.competencia DESC, f.nome"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        if ($row['ajustes']) {
            $row['ajustes'] = json_decode($row['ajustes'], true);
        }
    }
    unset($row);
    json_response($rows);
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['funcionario_id', 'competencia'] as $f) {
        if (empty($d[$f])) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    $user = current_user();
    $stmt = db()->prepare(
        'INSERT INTO folhas (funcionario_id, competencia, total_lancamentos,
         salario_fixo_aplicado, adicionais, descontos_manuais, total_vales,
         bruto, liquido, ajustes, status, data_processamento, data_pagamento,
         observacoes, processado_por)
         VALUES (:fid, :comp, :tl, :sf, :add, :dm, :tv, :bruto, :liq,
         :ajustes, :status, :dp, :dpag, :obs, :uid)'
    );
    $stmt->execute([
        ':fid'    => (int) $d['funcionario_id'],
        ':comp'   => $d['competencia'],
        ':tl'     => $d['total_lancamentos'] ?? 0,
        ':sf'     => $d['salario_fixo_aplicado'] ?? 0,
        ':add'    => $d['adicionais'] ?? 0,
        ':dm'     => $d['descontos_manuais'] ?? 0,
        ':tv'     => $d['total_vales'] ?? 0,
        ':bruto'  => $d['bruto'] ?? 0,
        ':liq'    => $d['liquido'] ?? 0,
        ':ajustes'=> isset($d['ajustes']) ? json_encode($d['ajustes']) : null,
        ':status' => $d['status'] ?? 'aberta',
        ':dp'     => $d['data_processamento'] ?? null,
        ':dpag'   => $d['data_pagamento'] ?? null,
        ':obs'    => $d['observacoes'] ?? null,
        ':uid'    => $user['id'],
    ]);
    $id = (int) db()->lastInsertId();
    $row = db()->query("SELECT fo.*, f.nome AS funcionario_nome FROM folhas fo JOIN funcionarios f ON f.id=fo.funcionario_id WHERE fo.id={$id}")->fetch();
    json_response($row, 201);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        json_error('Parâmetro id obrigatório', 400);
    }
    $d = json_input();
    $user = current_user();
    $stmt = db()->prepare(
        'UPDATE folhas SET total_lancamentos=:tl, salario_fixo_aplicado=:sf,
         adicionais=:add, descontos_manuais=:dm, total_vales=:tv,
         bruto=:bruto, liquido=:liq, ajustes=:ajustes,
         status=:status, data_processamento=:dp, data_pagamento=:dpag,
         observacoes=:obs, processado_por=:uid
         WHERE id=:id'
    );
    $stmt->execute([
        ':tl'     => $d['total_lancamentos'] ?? 0,
        ':sf'     => $d['salario_fixo_aplicado'] ?? 0,
        ':add'    => $d['adicionais'] ?? 0,
        ':dm'     => $d['descontos_manuais'] ?? 0,
        ':tv'     => $d['total_vales'] ?? 0,
        ':bruto'  => $d['bruto'] ?? 0,
        ':liq'    => $d['liquido'] ?? 0,
        ':ajustes'=> isset($d['ajustes']) ? json_encode($d['ajustes']) : null,
        ':status' => $d['status'] ?? 'aberta',
        ':dp'     => $d['data_processamento'] ?? null,
        ':dpag'   => $d['data_pagamento'] ?? null,
        ':obs'    => $d['observacoes'] ?? null,
        ':uid'    => $user['id'],
        ':id'     => $id,
    ]);
    $row = db()->query("SELECT fo.*, f.nome AS funcionario_nome FROM folhas fo JOIN funcionarios f ON f.id=fo.funcionario_id WHERE fo.id={$id}")->fetch();
    json_response($row);
}

json_error('Método não permitido', 405);
