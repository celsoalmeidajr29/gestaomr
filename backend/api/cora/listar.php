<?php
/**
 * GET /backend/api/cora/listar.php
 *
 * Lista transferências Cora com filtros.
 * Filtros: ?empresa=&status=&competencia=&funcionario_id=&desde=&limit=
 *
 * Usado pelo frontend para mostrar histórico/auditoria por folha.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('despesas');

$where = [];
$params = [];

if (!empty($_GET['empresa'])) {
    $where[] = 'empresa = :empresa';
    $params[':empresa'] = strtoupper((string) $_GET['empresa']);
}
if (!empty($_GET['status'])) {
    $where[] = 'status = :status';
    $params[':status'] = (string) $_GET['status'];
}
if (!empty($_GET['competencia'])) {
    $where[] = 'competencia = :comp';
    $params[':comp'] = (string) $_GET['competencia'];
}
if (!empty($_GET['funcionario_id'])) {
    $where[] = 'funcionario_id = :fid';
    $params[':fid'] = (int) $_GET['funcionario_id'];
}
if (!empty($_GET['desde'])) {
    $where[] = 'criado_em >= :desde';
    $params[':desde'] = (string) $_GET['desde'];
}

$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
$limit = max(1, min(500, (int) ($_GET['limit'] ?? 100)));

$stmt = db()->prepare(
    "SELECT id, folha_id, funcionario_id, funcionario_nome, competencia, empresa,
            valor_liquido, chave_pix, tipo_pix,
            cora_transfer_id, status, erro_mensagem,
            criado_em, atualizado_em
     FROM transferencias_cora
     {$whereSql}
     ORDER BY criado_em DESC
     LIMIT {$limit}"
);
$stmt->execute($params);
json_response($stmt->fetchAll());
