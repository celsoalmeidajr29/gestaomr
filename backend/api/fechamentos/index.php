<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('fechamentos');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where = [];
    if (!empty($_GET['cliente_id'])) {
        $where[] = 'f.cliente_id = :cliente_id';
        $params[':cliente_id'] = (int) $_GET['cliente_id'];
    }
    if (!empty($_GET['competencia'])) {
        $where[] = 'f.competencia = :competencia';
        $params[':competencia'] = $_GET['competencia'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 'f.status_fatura = :status';
        $params[':status'] = $_GET['status'];
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // Marcar automaticamente faturas vencidas
    db()->exec(
        "UPDATE fechamentos SET status_fatura='Vencida'
         WHERE data_vencimento < CURDATE()
         AND status_fatura NOT IN ('Paga','Vencida')"
    );

    $stmt = db()->prepare(
        "SELECT f.*, c.nome AS cliente_nome,
                CONCAT('F-', LPAD(f.numero, 4, '0')) AS numero_formatado,
                CASE WHEN f.data_vencimento < CURDATE() AND f.status_fatura NOT IN ('Paga') THEN 1 ELSE 0 END AS em_atraso
         FROM fechamentos f
         JOIN clientes c ON c.id = f.cliente_id
         {$whereClause}
         ORDER BY f.numero DESC"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Inclui IDs dos lançamentos de cada fechamento (necessário para PDF/XLSX da medição)
    if ($rows) {
        $fIds = array_column($rows, 'id');
        $ph = implode(',', array_fill(0, count($fIds), '?'));
        $stmt2 = db()->prepare(
            "SELECT fechamento_id, lancamento_id AS id FROM fechamento_lancamentos WHERE fechamento_id IN ({$ph}) ORDER BY lancamento_id"
        );
        $stmt2->execute($fIds);
        $lancMap = [];
        foreach ($stmt2->fetchAll() as $r) {
            $lancMap[$r['fechamento_id']][] = ['id' => $r['id']];
        }
        foreach ($rows as &$row) {
            $row['lancamentos'] = $lancMap[$row['id']] ?? [];
        }
        unset($row);
    }
    json_response($rows);
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['cliente_id', 'competencia', 'template'] as $f) {
        if (empty($d[$f])) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    if (!isset($d['lancamento_ids']) || !is_array($d['lancamento_ids'])) {
        json_error('Campo obrigatório: lancamento_ids (array)', 422);
    }
    if (empty($d['lancamento_ids']) && empty($d['is_custom'])) {
        json_error('Fatura sem is_custom requer ao menos um lançamento', 422);
    }

    $user = current_user();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Próximo número de fatura
        $nextNum = (int) ($pdo->query('SELECT COALESCE(MAX(numero), 0) + 1 FROM fechamentos')->fetchColumn());

        $stmt = $pdo->prepare(
            'INSERT INTO fechamentos (numero, cliente_id, template, competencia,
             data_inicio, data_fim, data_vencimento, total_fatura, total_pago,
             total_imposto, lucro, qtd_lancamentos, status_fatura, numero_nf,
             is_custom, observacoes, criado_por)
             VALUES (:num, :cid, :tpl, :comp,
             :di, :df, :dv, :tfat, :tpago,
             :timp, :lucro, :qtd, :status, :nf,
             :custom, :obs, :uid)'
        );
        $stmt->execute([
            ':num'    => $nextNum,
            ':cid'    => (int) $d['cliente_id'],
            ':tpl'    => $d['template'],
            ':comp'   => $d['competencia'],
            ':di'     => $d['data_inicio'] ?? null,
            ':df'     => $d['data_fim'] ?? null,
            ':dv'     => $d['data_vencimento'] ?? null,
            ':tfat'   => $d['total_fatura'] ?? 0,
            ':tpago'  => $d['total_pago'] ?? 0,
            ':timp'   => $d['total_imposto'] ?? 0,
            ':lucro'  => $d['lucro'] ?? 0,
            ':qtd'    => count($d['lancamento_ids']),
            ':status' => $d['status_fatura'] ?? 'Enviada',
            ':nf'     => $d['numero_nf'] ?? null,
            ':custom' => (int) ($d['is_custom'] ?? 0),
            ':obs'    => $d['observacoes'] ?? null,
            ':uid'    => $user['id'],
        ]);
        $fid = (int) $pdo->lastInsertId();

        // Vincular lançamentos (pode ser vazio para faturas custom/XML)
        if (!empty($d['lancamento_ids'])) {
            $slink = $pdo->prepare(
                'INSERT IGNORE INTO fechamento_lancamentos (fechamento_id, lancamento_id) VALUES (:fid, :lid)'
            );
            foreach ($d['lancamento_ids'] as $lid) {
                $slink->execute([':fid' => $fid, ':lid' => (int) $lid]);
            }
            $ids = implode(',', array_map('intval', $d['lancamento_ids']));
            $pdo->exec("UPDATE lancamentos SET status='fechado' WHERE id IN ({$ids})");
        }

        // Log de status inicial
        $pdo->prepare(
            'INSERT INTO fechamento_status_log (fechamento_id, status_anterior, status_novo, usuario_id)
             VALUES (:fid, NULL, :status, :uid)'
        )->execute([':fid' => $fid, ':status' => $d['status_fatura'] ?? 'Enviada', ':uid' => $user['id']]);

        $pdo->commit();
        $row = $pdo->query(
            "SELECT f.*, c.nome AS cliente_nome, CONCAT('F-', LPAD(f.numero, 4, '0')) AS numero_formatado
             FROM fechamentos f JOIN clientes c ON c.id=f.cliente_id WHERE f.id={$fid}"
        )->fetch();
        json_response($row, 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

json_error('Método não permitido', 405);
