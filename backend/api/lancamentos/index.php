<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where = [];
    if (!empty($_GET['servico_id'])) {
        $where[] = 'l.servico_id = :servico_id';
        $params[':servico_id'] = (int) $_GET['servico_id'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 'l.status = :status';
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['data_inicio'])) {
        $where[] = 'l.data >= :data_inicio';
        $params[':data_inicio'] = $_GET['data_inicio'];
    }
    if (!empty($_GET['data_fim'])) {
        $where[] = 'l.data <= :data_fim';
        $params[':data_fim'] = $_GET['data_fim'];
    }
    if (!empty($_GET['cliente_id'])) {
        $where[] = 'c.id = :cliente_id';
        $params[':cliente_id'] = (int) $_GET['cliente_id'];
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $sql = "SELECT l.*, s.codigo AS servico_codigo, s.descricao AS servico_descricao,
                   s.template, s.categoria_servico, c.id AS cliente_id, c.nome AS cliente_nome
            FROM lancamentos l
            JOIN servicos s ON s.id = l.servico_id
            JOIN clientes c ON c.id = s.cliente_id
            {$whereClause}
            ORDER BY l.data DESC, l.id DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Enriquecer cada lançamento com funcionários e extras
    if ($rows) {
        $ids = implode(',', array_column($rows, 'id'));
        $funcs = db()->query(
            "SELECT lf.lancamento_id, lf.papel, lf.participacao_percentual,
                    f.id AS funcionario_id, f.nome AS funcionario_nome
             FROM lancamento_funcionarios lf
             JOIN funcionarios f ON f.id = lf.funcionario_id
             WHERE lf.lancamento_id IN ({$ids})"
        )->fetchAll();
        $extras = db()->query(
            "SELECT * FROM lancamento_extras WHERE lancamento_id IN ({$ids})"
        )->fetchAll();

        $funcsByLanc = [];
        foreach ($funcs as $f) {
            $funcsByLanc[$f['lancamento_id']][] = $f;
        }
        $extrasByLanc = [];
        foreach ($extras as $e) {
            $extrasByLanc[$e['lancamento_id']][] = $e;
        }
        foreach ($rows as &$row) {
            $row['funcionarios'] = $funcsByLanc[$row['id']] ?? [];
            $row['extras'] = $extrasByLanc[$row['id']] ?? [];
        }
        unset($row);
    }
    json_response($rows);
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['servico_id', 'data'] as $f) {
        if (empty($d[$f])) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    $user = current_user();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO lancamentos (servico_id, data, is_domingo, is_feriado,
             horas_trabalhadas, km_rodados, pedagio, outros, batida_extra,
             horas_extras, km_extras,
             extra_horas_fatura, extra_km_fatura, adic_dom_fatura,
             extra_horas_paga, extra_km_pago, adic_dom_pago,
             pedagio_fatura, pedagio_reembolso,
             total_fatura, total_pago, aliquota_aplicada, imposto, lucro,
             status, observacao, criado_por)
             VALUES (:sid, :data, :isdom, :isferia,
             :ht, :km, :ped, :outros, :batida,
             :hext, :kext,
             :hef, :kef, :adf,
             :hep, :kep, :adp,
             :pedf, :pedr,
             :tfat, :tpago, :aliq, :imp, :lucro,
             :status, :obs, :uid)'
        );
        $stmt->execute([
            ':sid'    => (int) $d['servico_id'],
            ':data'   => $d['data'],
            ':isdom'  => (int) ($d['is_domingo'] ?? 0),
            ':isferia'=> (int) ($d['is_feriado'] ?? 0),
            ':ht'     => $d['horas_trabalhadas'] ?? 0,
            ':km'     => $d['km_rodados'] ?? 0,
            ':ped'    => $d['pedagio'] ?? 0,
            ':outros' => $d['outros'] ?? 0,
            ':batida' => $d['batida_extra'] ?? 0,
            ':hext'   => $d['horas_extras'] ?? 0,
            ':kext'   => $d['km_extras'] ?? 0,
            ':hef'    => $d['extra_horas_fatura'] ?? 0,
            ':kef'    => $d['extra_km_fatura'] ?? 0,
            ':adf'    => $d['adic_dom_fatura'] ?? 0,
            ':hep'    => $d['extra_horas_paga'] ?? 0,
            ':kep'    => $d['extra_km_pago'] ?? 0,
            ':adp'    => $d['adic_dom_pago'] ?? 0,
            ':pedf'   => $d['pedagio_fatura'] ?? 0,
            ':pedr'   => $d['pedagio_reembolso'] ?? 0,
            ':tfat'   => $d['total_fatura'] ?? 0,
            ':tpago'  => $d['total_pago'] ?? 0,
            ':aliq'   => $d['aliquota_aplicada'] ?? 0,
            ':imp'    => $d['imposto'] ?? 0,
            ':lucro'  => $d['lucro'] ?? 0,
            ':status' => $d['status'] ?? 'pendente',
            ':obs'    => $d['observacao'] ?? null,
            ':uid'    => $user['id'],
        ]);
        $lid = (int) $pdo->lastInsertId();

        // Funcionários M:N
        if (!empty($d['funcionarios']) && is_array($d['funcionarios'])) {
            $sfunc = $pdo->prepare(
                'INSERT INTO lancamento_funcionarios (lancamento_id, funcionario_id, papel, participacao_percentual)
                 VALUES (:lid, :fid, :papel, :perc)'
            );
            foreach ($d['funcionarios'] as $f) {
                $sfunc->execute([
                    ':lid'  => $lid,
                    ':fid'  => (int) $f['funcionario_id'],
                    ':papel'=> $f['papel'] ?? null,
                    ':perc' => $f['participacao_percentual'] ?? 100,
                ]);
            }
        }

        // Extras (chave/valor)
        if (!empty($d['extras']) && is_array($d['extras'])) {
            $sext = $pdo->prepare(
                'INSERT INTO lancamento_extras (lancamento_id, chave, valor)
                 VALUES (:lid, :chave, :valor)
                 ON DUPLICATE KEY UPDATE valor=VALUES(valor)'
            );
            foreach ($d['extras'] as $e) {
                $sext->execute([':lid' => $lid, ':chave' => $e['chave'], ':valor' => $e['valor']]);
            }
        }

        $pdo->commit();
        $row = $pdo->query(
            "SELECT l.*, s.codigo AS servico_codigo, s.descricao AS servico_descricao,
                    s.template, s.categoria_servico, c.id AS cliente_id, c.nome AS cliente_nome
             FROM lancamentos l JOIN servicos s ON s.id=l.servico_id JOIN clientes c ON c.id=s.cliente_id
             WHERE l.id={$lid}"
        )->fetch();
        json_response($row, 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

json_error('Método não permitido', 405);
