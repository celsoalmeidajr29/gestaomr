<?php
/**
 * GET /backend/api/cora/logs.php
 *
 * Lista webhooks recebidos da Cora (audit / debug).
 * Filtros opcionais: ?empresa=&processado=0|1&limit=N&desde=ISO_DATE
 *
 * Para uso do frontend e troubleshooting.
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
if (isset($_GET['processado']) && $_GET['processado'] !== '') {
    $where[] = 'processado = :processado';
    $params[':processado'] = (int) $_GET['processado'];
}
if (isset($_GET['signature_valid']) && $_GET['signature_valid'] !== '') {
    $where[] = 'signature_valid = :sigval';
    $params[':sigval'] = (int) $_GET['signature_valid'];
}
if (!empty($_GET['cora_transfer_id'])) {
    $where[] = 'cora_transfer_id = :cid';
    $params[':cid'] = (string) $_GET['cora_transfer_id'];
}
if (!empty($_GET['desde'])) {
    $where[] = 'recebido_em >= :desde';
    $params[':desde'] = (string) $_GET['desde'];
}

$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
$limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));

$stmt = db()->prepare(
    "SELECT id, evento, empresa, cora_transfer_id, signature_valid, processado,
            erro_processamento, ip_origem, recebido_em
     FROM cora_webhook_logs
     {$whereSql}
     ORDER BY recebido_em DESC
     LIMIT {$limit}"
);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Não inclui payload completo na lista (pode ser grande); endpoint /logs.php?id= retorna detalhe
json_response($rows);
