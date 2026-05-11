<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') json_error('Metodo nao permitido', 405);

$records = json_input();
if (!is_array($records) || empty($records)) json_error('Array de registros obrigatorio', 422);

$stmt = db()->prepare(
    'INSERT INTO pc_vendas
       (placa, dt_registro, dt_inicial, periodo, usuario, cargo, origem, trecho, forma_pag, valor, irregular, canal, zona, tipo)
     VALUES
       (:placa, :dt_reg, :dt_ini, :periodo, :usuario, :cargo, :origem, :trecho, :forma_pag, :valor, :irregular, :canal, :zona, :tipo)
     ON DUPLICATE KEY UPDATE
       dt_registro = VALUES(dt_registro),
       dt_inicial  = VALUES(dt_inicial),
       periodo     = VALUES(periodo),
       usuario     = VALUES(usuario),
       cargo       = VALUES(cargo),
       origem      = VALUES(origem),
       trecho      = VALUES(trecho),
       forma_pag   = VALUES(forma_pag),
       valor       = VALUES(valor),
       irregular   = VALUES(irregular),
       canal       = VALUES(canal),
       zona        = VALUES(zona),
       tipo        = VALUES(tipo)'
);

$inseridos = 0;
$atualizados = 0;

db()->beginTransaction();
try {
    foreach ($records as $r) {
        $placa = trim((string)($r['placa'] ?? ''));
        if (!$placa) continue;
        $stmt->execute([
            ':placa'     => $placa,
            ':dt_reg'    => $r['dt_registro'] ?: null,
            ':dt_ini'    => $r['dt_inicial'] ?: null,
            ':periodo'   => $r['periodo'] ?: null,
            ':usuario'   => $r['usuario'] ?: null,
            ':cargo'     => $r['cargo'] ?: null,
            ':origem'    => $r['origem'] ?: null,
            ':trecho'    => $r['trecho'] ?: null,
            ':forma_pag' => $r['forma_pag'] ?: null,
            ':valor'     => (float)($r['valor'] ?? 0),
            ':irregular' => (int)(bool)($r['irregular'] ?? false),
            ':canal'     => $r['canal'] ?: null,
            ':zona'      => $r['zona'] ?: null,
            ':tipo'      => $r['tipo'] ?: null,
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
