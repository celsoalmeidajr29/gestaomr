<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

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
