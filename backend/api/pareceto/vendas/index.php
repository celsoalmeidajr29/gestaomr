<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

// ---- GET: retorna registros do banco ----
if ($method === 'GET') {
    // Verifica se migration 016 foi executada (tabela pode não existir)
    $tblExists = db()->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pc_vendas'")->fetchColumn();
    if (!$tblExists) {
        json_error('Tabela pc_vendas nao encontrada. Execute a migration 016 no phpMyAdmin.', 503);
    }

    $where  = [];
    $params = [];
    if (!empty($_GET['de']))      { $where[] = 'dt_registro >= :de';  $params[':de']      = $_GET['de']; }
    if (!empty($_GET['ate']))     { $where[] = 'dt_registro <= :ate'; $params[':ate']     = $_GET['ate'] . ' 23:59:59'; }
    if (!empty($_GET['trecho']))  { $where[] = 'trecho = :trecho';    $params[':trecho']  = $_GET['trecho']; }
    if (!empty($_GET['usuario'])) { $where[] = 'usuario = :usuario';  $params[':usuario'] = $_GET['usuario']; }
    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = db()->prepare("SELECT * FROM pc_vendas {$wc} ORDER BY dt_registro DESC LIMIT 50000");
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method !== 'POST') json_error('Metodo nao permitido', 405);

$records = json_input();
if (!is_array($records) || empty($records)) json_error('Array de registros obrigatorio', 422);

// Detecta se migration 019 foi aplicada (adiciona hash_dedup, nome_arquivo, importado_em).
// Permite o sistema funcionar com o schema antigo (016) e o novo (019).
$hasMig019 = (bool)db()->query(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'pc_vendas'
       AND COLUMN_NAME  = 'hash_dedup'"
)->fetchColumn();

if ($hasMig019) {
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
} else {
    // Schema antigo (migration 016): dedup por placa
    $stmt = db()->prepare(
        'INSERT INTO pc_vendas
           (placa, dt_registro, dt_inicial, periodo, usuario, cargo,
            origem, trecho, forma_pag, valor, irregular, canal, zona, tipo)
         VALUES
           (:placa, :dt_reg, :dt_ini, :periodo, :usuario, :cargo,
            :origem, :trecho, :forma_pag, :valor, :irregular, :canal, :zona, :tipo)
         ON DUPLICATE KEY UPDATE
           dt_registro = VALUES(dt_registro),
           valor       = VALUES(valor)'
    );
}

$inseridos  = 0;
$duplicatas = 0;

db()->beginTransaction();
try {
    foreach ($records as $r) {
        $placa = trim((string)($r['placa'] ?? ''));
        if (!$placa) continue;

        $dtReg = $r['dt_registro'] ?: null;
        $valor = round((float)($r['valor'] ?? 0), 2);

        if ($hasMig019) {
            $hashSrc = ($dtReg ?? '') . '|' . $placa . '|' . $valor;
            $hash    = $r['hash_dedup'] ?? sha1($hashSrc);
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
        } else {
            $stmt->execute([
                ':placa'     => $placa,
                ':dt_reg'    => $dtReg,
                ':dt_ini'    => $r['dt_inicial'] ?: null,
                ':periodo'   => $r['periodo'] ?: null,
                ':usuario'   => $r['usuario'] ?: null,
                ':cargo'     => $r['cargo'] ?: null,
                ':origem'    => $r['origem'] ?: null,
                ':trecho'    => $r['trecho'] ?: null,
                ':forma_pag' => $r['forma_pag'] ?: null,
                ':valor'     => $valor,
                ':irregular' => (int)(bool)($r['irregular'] ?? false),
                ':canal'     => $r['canal'] ?: null,
                ':zona'      => $r['zona'] ?: null,
                ':tipo'      => $r['tipo'] ?: null,
            ]);
        }

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
