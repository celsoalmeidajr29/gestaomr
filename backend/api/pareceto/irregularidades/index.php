<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

// ---- GET: retorna registros do banco ----
if ($method === 'GET') {
    $tblExists = db()->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pc_irregularidades'")->fetchColumn();
    if (!$tblExists) {
        json_error('Tabela pc_irregularidades nao encontrada. Execute a migration 016 no phpMyAdmin.', 503);
    }

    $where  = [];
    $params = [];
    if (!empty($_GET['de']))      { $where[] = 'dt_emissao >= :de';      $params[':de']      = $_GET['de']; }
    if (!empty($_GET['ate']))     { $where[] = 'dt_emissao <= :ate';     $params[':ate']     = $_GET['ate'] . ' 23:59:59'; }
    if (!empty($_GET['trecho']))  { $where[] = 'trecho = :trecho';       $params[':trecho']  = $_GET['trecho']; }
    if (!empty($_GET['emissor'])) { $where[] = 'emissor = :emissor';     $params[':emissor'] = $_GET['emissor']; }
    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = db()->prepare("SELECT * FROM pc_irregularidades {$wc} ORDER BY dt_emissao DESC LIMIT 50000");
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method !== 'POST') json_error('Metodo nao permitido', 405);

$records = json_input();
if (!is_array($records) || empty($records)) json_error('Array de registros obrigatorio', 422);

$stmt = db()->prepare(
    'INSERT INTO pc_irregularidades
       (id_csv, dt_emissao, status, emissor, cargo, trecho, placa, valor, origem_class, semana)
     VALUES
       (:id_csv, :dt_emissao, :status, :emissor, :cargo, :trecho, :placa, :valor, :origem_class, :semana)
     ON DUPLICATE KEY UPDATE
       dt_emissao   = VALUES(dt_emissao),
       status       = VALUES(status),
       emissor      = VALUES(emissor),
       cargo        = VALUES(cargo),
       trecho       = VALUES(trecho),
       placa        = VALUES(placa),
       valor        = VALUES(valor),
       origem_class = VALUES(origem_class),
       semana       = VALUES(semana)'
);

$inseridos = 0;
$atualizados = 0;

db()->beginTransaction();
try {
    foreach ($records as $r) {
        $id_csv = trim((string)($r['id_csv'] ?? ''));
        if (!$id_csv) continue;
        $stmt->execute([
            ':id_csv'      => $id_csv,
            ':dt_emissao'  => $r['dt_emissao'] ?: null,
            ':status'      => $r['status'] ?: 'Irregular',
            ':emissor'     => $r['emissor'] ?: null,
            ':cargo'       => $r['cargo'] ?: null,
            ':trecho'      => $r['trecho'] ?: null,
            ':placa'       => $r['placa'] ?: null,
            ':valor'       => (float)($r['valor'] ?? 0),
            ':origem_class'=> $r['origem_class'] ?: null,
            ':semana'      => $r['semana'] ?: null,
        ]);
        $rc = $stmt->rowCount();
        if ($rc === 1) $inseridos++;
        elseif ($rc === 2) $atualizados++;
    }
    db()->commit();
} catch (\Throwable $e) {
    db()->rollBack();
    throw $e;
}

json_response(['inseridos' => $inseridos, 'atualizados' => $atualizados, 'total' => $inseridos + $atualizados]);
