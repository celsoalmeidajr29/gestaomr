<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('despesas');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

if ($method === 'GET') {
    $row = db()->query("SELECT * FROM despesas WHERE id = {$id}")->fetch();
    if (!$row) {
        json_error('Despesa não encontrada', 404);
    }
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $stmt = db()->prepare(
        'UPDATE despesas SET descricao=:desc, competencia=:comp, tipo=:tipo, valor=:valor,
         centro_custo=:cc, origem=:origem, data_lancamento=:dl, data_pagamento=:dp,
         parcela_atual=:pa, parcela_total=:pt, status=:status, observacoes=:obs
         WHERE id=:id'
    );
    $stmt->execute([
        ':desc'  => $d['descricao'],
        ':comp'  => $d['competencia'],
        ':tipo'  => $d['tipo'] ?? 'AVULSA',
        ':valor' => $d['valor'],
        ':cc'    => $d['centro_custo'] ?? null,
        ':origem'=> $d['origem'] ?? null,
        ':dl'    => $d['data_lancamento'] ?? null,
        ':dp'    => $d['data_pagamento'] ?? null,
        ':pa'    => $d['parcela_atual'] ?? null,
        ':pt'    => $d['parcela_total'] ?? null,
        ':status'=> $d['status'] ?? 'pendente',
        ':obs'   => $d['observacoes'] ?? null,
        ':id'    => $id,
    ]);
    json_response(db()->query("SELECT * FROM despesas WHERE id = {$id}")->fetch());
}

if ($method === 'DELETE') {
    $stmt = db()->prepare("UPDATE despesas SET status='cancelado' WHERE id=:id");
    $stmt->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'cancelado']);
}

json_error('Método não permitido', 405);
