<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('lancamentos');

$id = (int) ($_GET['id'] ?? 0);
if (!$id) json_error('ID obrigatório', 400);

$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'];

$row = $pdo->prepare(
    'SELECT d.*, f.nome AS funcionario_nome FROM diarias_freelancer d
     JOIN funcionarios f ON f.id = d.funcionario_id WHERE d.id = :id'
);
$row->execute([':id' => $id]);
$diaria = $row->fetch();
if (!$diaria) json_error('Diária não encontrada', 404);

if ($method === 'GET') {
    json_response($diaria);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d    = json_input();
    $comp = $d['competencia'] ?? substr((string) ($d['data'] ?? $diaria['data']), 0, 7);
    $pdo->prepare(
        'UPDATE diarias_freelancer SET
           competencia   = :comp,
           data          = :data,
           funcionario_id = :fid,
           nome_snapshot = :nome,
           cliente_id    = :cid,
           cliente_nome  = :cnome,
           valor         = :valor,
           observacoes   = :obs
         WHERE id = :id'
    )->execute([
        ':comp'  => $comp,
        ':data'  => $d['data']           ?? $diaria['data'],
        ':fid'   => (int) ($d['funcionario_id'] ?? $diaria['funcionario_id']),
        ':nome'  => $d['nome_snapshot']  ?? $diaria['nome_snapshot'],
        ':cid'   => isset($d['cliente_id']) ? (int) $d['cliente_id'] : $diaria['cliente_id'],
        ':cnome' => $d['cliente_nome']   ?? $diaria['cliente_nome'],
        ':valor' => (float) ($d['valor'] ?? $diaria['valor']),
        ':obs'   => $d['observacoes']    ?? $diaria['observacoes'],
        ':id'    => $id,
    ]);
    $updated = $pdo->query("SELECT * FROM diarias_freelancer WHERE id={$id}")->fetch();
    json_response($updated);
}

if ($method === 'DELETE') {
    $pdo->prepare('DELETE FROM diarias_freelancer WHERE id = :id')->execute([':id' => $id]);
    json_response(null, 204);
}

json_error('Método não permitido', 405);
