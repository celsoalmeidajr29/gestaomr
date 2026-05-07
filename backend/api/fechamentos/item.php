<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('fechamentos');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

function fetch_fechamento(int $id): array|false
{
    $row = db()->query(
        "SELECT f.*, c.nome AS cliente_nome,
                CONCAT('F-', LPAD(f.numero, 4, '0')) AS numero_formatado
         FROM fechamentos f JOIN clientes c ON c.id=f.cliente_id
         WHERE f.id={$id}"
    )->fetch();
    if (!$row) {
        return false;
    }
    $row['lancamentos'] = db()->query(
        "SELECT l.id, l.data, l.total_fatura, l.total_pago, l.status,
                s.codigo AS servico_codigo, s.descricao AS servico_descricao
         FROM fechamento_lancamentos fl
         JOIN lancamentos l ON l.id=fl.lancamento_id
         JOIN servicos s ON s.id=l.servico_id
         WHERE fl.fechamento_id={$id}
         ORDER BY l.data"
    )->fetchAll();
    $row['historico_status'] = db()->query(
        "SELECT fsl.*, u.nome AS usuario_nome
         FROM fechamento_status_log fsl
         LEFT JOIN usuarios u ON u.id=fsl.usuario_id
         WHERE fsl.fechamento_id={$id}
         ORDER BY fsl.em"
    )->fetchAll();
    return $row;
}

if ($method === 'GET') {
    $row = fetch_fechamento($id);
    if (!$row) {
        json_error('Fechamento não encontrado', 404);
    }
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $user = current_user();
    $pdo = db();

    // Status transition — registra no log
    $row_atual = $pdo->query("SELECT status_fatura, competencia, cliente_id FROM fechamentos WHERE id={$id}")->fetch();
    $novoStatus = $d['status_fatura'] ?? $row_atual['status_fatura'];
    $novaComp   = $d['competencia'] ?? $row_atual['competencia'];

    $novoClienteId = isset($d['cliente_id']) && $d['cliente_id'] ? (int) $d['cliente_id'] : $row_atual['cliente_id'];

    $stmt = $pdo->prepare(
        'UPDATE fechamentos SET status_fatura=:status, numero_nf=:nf,
         data_vencimento=:dv, data_pagamento=:dp, observacoes=:obs,
         competencia=:comp, cliente_id=:cid
         WHERE id=:id'
    );
    $stmt->execute([
        ':status' => $novoStatus,
        ':nf'     => $d['numero_nf'] ?? null,
        ':dv'     => $d['data_vencimento'] ?? null,
        ':dp'     => $d['data_pagamento'] ?? null,
        ':obs'    => $d['observacoes'] ?? null,
        ':comp'   => $novaComp,
        ':cid'    => $novoClienteId,
        ':id'     => $id,
    ]);

    if ($novoStatus !== $atual) {
        $pdo->prepare(
            'INSERT INTO fechamento_status_log (fechamento_id, status_anterior, status_novo, usuario_id, observacao)
             VALUES (:fid, :ant, :novo, :uid, :obs)'
        )->execute([
            ':fid' => $id,
            ':ant' => $atual,
            ':novo'=> $novoStatus,
            ':uid' => $user['id'],
            ':obs' => $d['observacoes'] ?? null,
        ]);
    }

    json_response(fetch_fechamento($id));
}

if ($method === 'DELETE') {
    // Só admin pode excluir fechamento; desvincula lançamentos antes
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec("UPDATE lancamentos SET status='pendente'
                    WHERE id IN (SELECT lancamento_id FROM fechamento_lancamentos WHERE fechamento_id={$id})");
        $pdo->exec("DELETE FROM fechamentos WHERE id={$id}");
        $pdo->commit();
        json_response(['deleted' => $id]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

json_error('Método não permitido', 405);
