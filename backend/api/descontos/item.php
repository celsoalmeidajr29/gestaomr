<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('descontos');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

if ($method === 'GET') {
    $row = db()->query("SELECT * FROM descontos WHERE id = {$id}")->fetch();
    if (!$row) {
        json_error('Desconto não encontrado', 404);
    }
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $stmt = db()->prepare(
        'UPDATE descontos SET funcionario_id=:fid, alvo_nome=:alvo, competencia=:comp,
         tipo_vale=:tipo, valor=:valor, centro_custo=:cc, forma_pagamento=:forma,
         data=:data, observacoes=:obs
         WHERE id=:id'
    );
    $stmt->execute([
        ':fid'  => $d['funcionario_id'] ?? null,
        ':alvo' => $d['alvo_nome'],
        ':comp' => $d['competencia'],
        ':tipo' => $d['tipo_vale'] ?? 'VALE',
        ':valor'=> $d['valor'],
        ':cc'   => $d['centro_custo'] ?? null,
        ':forma'=> $d['forma_pagamento'] ?? null,
        ':data' => $d['data'] ?? null,
        ':obs'  => $d['observacoes'] ?? null,
        ':id'   => $id,
    ]);
    json_response(db()->query("SELECT * FROM descontos WHERE id = {$id}")->fetch());
}

if ($method === 'DELETE') {
    $stmt = db()->prepare('DELETE FROM descontos WHERE id=:id');
    $stmt->execute([':id' => $id]);
    json_response(['deleted' => $id]);
}

json_error('Método não permitido', 405);
