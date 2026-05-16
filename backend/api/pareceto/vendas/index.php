<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];

// ---- GET: retorna registros do banco (paginado) ----
if ($method === 'GET') {
    @ini_set('memory_limit', '512M');

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
    $wc = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $perPage = 20000;
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $offset  = ($page - 1) * $perPage;

    $cntStmt = db()->prepare("SELECT COUNT(*) FROM pc_vendas {$wc}");
    $cntStmt->execute($params);
    $total = (int)$cntStmt->fetchColumn();

    $stmt = db()->prepare("SELECT * FROM pc_vendas {$wc} ORDER BY dt_registro ASC LIMIT {$perPage} OFFSET {$offset}");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    header('X-Total-Count: ' . $total);
    header('X-Page: ' . $page);
    header('X-Has-More: ' . ($offset + count($rows) < $total ? '1' : '0'));
    json_response($rows);
}

if ($method !== 'POST') json_error('Metodo nao permitido', 405);

$records = json_input();
if (!is_array($records) || empty($records)) json_error('Array de registros obrigatorio', 422);

// Unicidade por (placa, dt_registro): mesma placa na mesma data/hora = mesma transação.
// SELECT-before-UPDATE-or-INSERT: funciona com qualquer versão do schema (016/019/021).
// Se migration 021 foi aplicada (uq_placa_dt), o UPDATE usa o índice e é eficiente.
$stmtChk = db()->prepare(
    'SELECT id FROM pc_vendas WHERE placa = :placa AND dt_registro = :dt_reg LIMIT 1'
);

// Colunas extras existem a partir da migration 019/021
$hasCols = (bool)db()->query(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'pc_vendas'
       AND COLUMN_NAME  = 'nome_arquivo'"
)->fetchColumn();

if ($hasCols) {
    $stmtIns = db()->prepare(
        'INSERT INTO pc_vendas
           (placa, dt_registro, dt_inicial, periodo, usuario, cargo,
            origem, trecho, forma_pag, valor, irregular, canal, zona, tipo,
            nome_arquivo, importado_em)
         VALUES
           (:placa, :dt_reg, :dt_ini, :periodo, :usuario, :cargo,
            :origem, :trecho, :forma_pag, :valor, :irregular, :canal, :zona, :tipo,
            :nome_arquivo, NOW())'
    );
    $stmtUpd = db()->prepare(
        'UPDATE pc_vendas SET
           dt_inicial   = :dt_ini,
           periodo      = :periodo,
           usuario      = :usuario,
           cargo        = :cargo,
           origem       = :origem,
           trecho       = :trecho,
           forma_pag    = :forma_pag,
           valor        = :valor,
           irregular    = :irregular,
           canal        = :canal,
           zona         = :zona,
           tipo         = :tipo,
           nome_arquivo = :nome_arquivo
         WHERE id = :id'
    );
} else {
    $stmtIns = db()->prepare(
        'INSERT INTO pc_vendas
           (placa, dt_registro, dt_inicial, periodo, usuario, cargo,
            origem, trecho, forma_pag, valor, irregular, canal, zona, tipo)
         VALUES
           (:placa, :dt_reg, :dt_ini, :periodo, :usuario, :cargo,
            :origem, :trecho, :forma_pag, :valor, :irregular, :canal, :zona, :tipo)'
    );
    $stmtUpd = db()->prepare(
        'UPDATE pc_vendas SET
           dt_inicial = :dt_ini,
           periodo    = :periodo,
           usuario    = :usuario,
           cargo      = :cargo,
           origem     = :origem,
           trecho     = :trecho,
           forma_pag  = :forma_pag,
           valor      = :valor,
           irregular  = :irregular,
           canal      = :canal,
           zona       = :zona,
           tipo       = :tipo
         WHERE id = :id'
    );
}

$inseridos   = 0;
$atualizados = 0;

db()->beginTransaction();
try {
    foreach ($records as $r) {
        $placa = trim((string)($r['placa'] ?? ''));
        if (!$placa) continue;

        $dtReg = $r['dt_registro'] ?: null;
        $valor = round((float)($r['valor'] ?? 0), 2);

        // Busca por (placa, dt_registro)
        $stmtChk->execute([':placa' => $placa, ':dt_reg' => $dtReg]);
        $existingId = $stmtChk->fetchColumn();

        $params = [
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
        ];
        if ($hasCols) {
            $params[':nome_arquivo'] = $r['nome_arquivo'] ?: null;
        }

        if ($existingId) {
            $params[':id'] = $existingId;
            $stmtUpd->execute($params);
            $atualizados++;
        } else {
            $params[':placa']  = $placa;
            $params[':dt_reg'] = $dtReg;
            $stmtIns->execute($params);
            $inseridos++;
        }
    }
    db()->commit();
} catch (\Throwable $e) {
    db()->rollBack();
    throw $e;
}

json_response([
    'inseridos'   => $inseridos,
    'atualizados' => $atualizados,
    'total'       => $inseridos + $atualizados,
]);
