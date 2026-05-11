<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') json_error('Metodo nao permitido', 405);

$records = json_input();
if (!is_array($records) || empty($records)) json_error('Array de registros obrigatorio', 422);

// Insere usando hash_dedup como chave de unicidade.
// ON DUPLICATE KEY: ignora exatos duplicados (id = id e no-op mas forca rowCount=2).
$stmt = db()->prepare(
    'INSERT INTO pc_vendas
       (hash_dedup, placa, dt_registro, dt_inicial, periodo, usuario, cargo,
        origem, trecho, forma_pag, valor, irregular, canal, zona, tipo,
        nome_arquivo, importado_em)
     VALUES
       (:hash, :placa, :dt_reg, :dt_ini, :periodo, :usuario, :cargo,
        :origem, :trecho, :forma_pag, :valor, :irregular, :canal, :zona, :tipo,
        :nome_arquivo, NOW())
     ON DUPLICATE KEY UPDATE id = id'
);

$inseridos  = 0;
$duplicatas = 0;

db()->beginTransaction();
try {
    foreach ($records as $r) {
        $placa = trim((string)($r['placa'] ?? ''));
        if (!$placa) continue;

        $dtReg    = $r['dt_registro'] ?: null;
        $valor    = round((float)($r['valor'] ?? 0), 2);
        $hashSrc  = ($dtReg ?? '') . '|' . $placa . '|' . $valor;
        $hash     = $r['hash_dedup'] ?? sha1($hashSrc);

        $stmt->execute([
            ':hash'         => $hash,
            ':placa'        => $placa,
            ':dt_reg'       => $dtReg,
            ':dt_ini'       => $r['dt_inicial'] ?: null,
            ':periodo'      => $r['periodo'] ?: null,
            ':usuario'      => $r['usuario'] ?: null,
            ':cargo'        => $r['cargo'] ?: null,
            ':origem'       => $r['origem'] ?: null,
            ':trecho'       => $r['trecho'] ?: null,
            ':forma_pag'    => $r['forma_pag'] ?: null,
            ':valor'        => $valor,
            ':irregular'    => (int)(bool)($r['irregular'] ?? false),
            ':canal'        => $r['canal'] ?: null,
            ':zona'         => $r['zona'] ?: null,
            ':tipo'         => $r['tipo'] ?: null,
            ':nome_arquivo' => $r['nome_arquivo'] ?: null,
        ]);

        $rc = $stmt->rowCount();
        if ($rc === 1) $inseridos++;
        else           $duplicatas++;
    }
    db()->commit();
} catch (\Throwable $e) {
    db()->rollBack();
    throw $e;
}

json_response([
    'inseridos'  => $inseridos,
    'duplicatas' => $duplicatas,
    'total'      => count($records),
]);
