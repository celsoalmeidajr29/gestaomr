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

// Detecta se migration 019 foi aplicada (adiciona hash_dedup, nome_arquivo, importado_em).
// Permite o sistema funcionar com o schema antigo (016) e o novo (019).
$hasMig019 = (bool)db()->query(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'pc_vendas'
       AND COLUMN_NAME  = 'hash_dedup'"
)->fetchColumn();

// Monta statements conforme schema disponível
if ($hasMig019) {
    // Schema novo (019): dedup por hash_dedup = SHA1(dt_registro|placa|valor)
    $stmtIns = db()->prepare(
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
    // Schema antigo (016): UNIQUE em placa — usamos SELECT-antes-INSERT para
    // garantir unicidade por transação (placa + dt_registro + valor) em vez de
    // tratar cada exportação como bloco.
    $stmtChk = db()->prepare(
        'SELECT COUNT(*) FROM pc_vendas
          WHERE placa = :placa AND dt_registro = :dt_reg AND ROUND(valor,2) = :valor'
    );
    $stmtIns = db()->prepare(
        'INSERT INTO pc_vendas
           (placa, dt_registro, dt_inicial, periodo, usuario, cargo,
            origem, trecho, forma_pag, valor, irregular, canal, zona, tipo)
         VALUES
           (:placa, :dt_reg, :dt_ini, :periodo, :usuario, :cargo,
            :origem, :trecho, :forma_pag, :valor, :irregular, :canal, :zona, :tipo)'
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
            $stmtIns->execute([
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
            $rc = $stmtIns->rowCount();
            if ($rc === 1) $inseridos++;
            else           $duplicatas++;
        } else {
            // Verifica existência por placa+dt_registro+valor antes de inserir
            $stmtChk->execute([':placa' => $placa, ':dt_reg' => $dtReg, ':valor' => $valor]);
            if ($stmtChk->fetchColumn() > 0) {
                $duplicatas++;
                continue;
            }
            $stmtIns->execute([
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
            $inseridos++;
        }
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
