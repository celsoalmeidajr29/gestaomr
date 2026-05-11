<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

require_auth();

$limit  = min((int)($_GET['limit']  ?? 100), 500);
$offset = (int)($_GET['offset'] ?? 0);
$tipo   = trim($_GET['tipo'] ?? '');
$refId  = isset($_GET['referencia_id']) ? (int)$_GET['referencia_id'] : null;

$where  = [];
$baseParams = [];

if ($tipo !== '') {
    $where[]          = 'l.tipo = :tipo';
    $baseParams[':tipo'] = $tipo;
}
if ($refId !== null) {
    $where[]          = 'l.referencia_id = :ref';
    $baseParams[':ref'] = $refId;
}

$whereSQL = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

// Total
$countStmt = db()->prepare("SELECT COUNT(*) FROM email_logs l {$whereSQL}");
$countStmt->execute($baseParams);
$total = (int) $countStmt->fetchColumn();

// Rows
$listStmt = db()->prepare(
    "SELECT l.id, l.tipo, l.referencia_id, l.assunto, l.destinatarios,
            l.status, l.erros, l.enviado_em,
            u.nome AS enviado_por_nome, u.email AS enviado_por_email
     FROM email_logs l
     LEFT JOIN usuarios u ON u.id = l.enviado_por
     {$whereSQL}
     ORDER BY l.enviado_em DESC
     LIMIT :limit OFFSET :offset"
);
foreach ($baseParams as $k => $v) {
    $listStmt->bindValue($k, $v, PDO::PARAM_STR);
}
$listStmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
$listStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$listStmt->execute();
$data = $listStmt->fetchAll();

foreach ($data as &$row) {
    $row['destinatarios'] = json_decode($row['destinatarios'] ?? '[]', true) ?: [];
    $row['erros']         = $row['erros'] ? (json_decode($row['erros'], true) ?: []) : [];
}
unset($row);

json_response(['items' => $data, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
