<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

$user = require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

// Apenas admin pode ver o log completo; demais veem apenas suas próprias ações
$isAdmin = $user['perfil_codigo'] === 'admin';

$conditions = [];
$params     = [];

if (!$isAdmin) {
    $conditions[] = 'a.usuario_id = :uid';
    $params[':uid'] = (int) $user['id'];
} elseif (!empty($_GET['usuario_id'])) {
    $conditions[] = 'a.usuario_id = :uid';
    $params[':uid'] = (int) $_GET['usuario_id'];
}

if (!empty($_GET['entidade'])) {
    $conditions[] = 'a.entidade = :entidade';
    $params[':entidade'] = $_GET['entidade'];
}

if (!empty($_GET['entidade_id'])) {
    $conditions[] = 'a.entidade_id = :entidade_id';
    $params[':entidade_id'] = (int) $_GET['entidade_id'];
}

if (!empty($_GET['acao'])) {
    $conditions[] = 'a.acao = :acao';
    $params[':acao'] = strtoupper($_GET['acao']);
}

if (!empty($_GET['data_inicio'])) {
    $conditions[] = 'DATE(a.criado_em) >= :di';
    $params[':di'] = $_GET['data_inicio'];
}

if (!empty($_GET['data_fim'])) {
    $conditions[] = 'DATE(a.criado_em) <= :df';
    $params[':df'] = $_GET['data_fim'];
}

$where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

$limit  = min((int) ($_GET['limit'] ?? 100), 500);
$offset = max((int) ($_GET['offset'] ?? 0), 0);

$sql = "SELECT a.id, a.usuario_id, u.nome AS usuario_nome,
               a.acao, a.entidade, a.entidade_id,
               a.dados_antes, a.dados_depois, a.criado_em
        FROM auditoria a
        LEFT JOIN usuarios u ON u.id = a.usuario_id
        {$where}
        ORDER BY a.criado_em DESC
        LIMIT {$limit} OFFSET {$offset}";

$stmt = db()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

foreach ($rows as &$row) {
    $row['dados_antes']  = $row['dados_antes']  ? json_decode($row['dados_antes'],  true) : null;
    $row['dados_depois'] = $row['dados_depois'] ? json_decode($row['dados_depois'], true) : null;
}
unset($row);

// Total para paginação
$countSql  = "SELECT COUNT(*) FROM auditoria a {$where}";
$countStmt = db()->prepare($countSql);
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

json_response([
    'total'  => $total,
    'limit'  => $limit,
    'offset' => $offset,
    'rows'   => $rows,
]);
