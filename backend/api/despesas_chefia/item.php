<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('despesas');
$method = $_SERVER['REQUEST_METHOD'];

$id = (int) ($_GET['id'] ?? 0);
if (!$id) json_error('ID inválido', 400);

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $origem = strtoupper(trim($d['origem'] ?? 'MANHÃES'));
    if (!in_array($origem, ['MANHÃES', 'RICARDO'], true)) $origem = 'MANHÃES';

    $stmt = db()->prepare(
        'UPDATE despesas_chefia SET
         descricao=:desc, competencia=:comp, tipo=:tipo, valor=:valor,
         origem=:origem, data_lancamento=:dl, data_pagamento=:dp,
         parcela_atual=:pa, parcela_total=:pt, status=:status, observacoes=:obs
         WHERE id=:id'
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
        ':id'     => $id,
    ]);
    json_response(db()->query("SELECT * FROM despesas_chefia WHERE id = {$id}")->fetch());
}

if ($method === 'DELETE') {
    db()->prepare("UPDATE despesas_chefia SET status='cancelado' WHERE id=:id")->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'cancelado']);
}

json_error('Método não permitido', 405);
