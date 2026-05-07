<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('lancamentos');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

function fetch_lancamento(int $id): array|false
{
    $row = db()->query(
        "SELECT l.*, s.codigo AS servico_codigo, s.descricao AS servico_descricao,
                s.template, s.categoria_servico, c.id AS cliente_id, c.nome AS cliente_nome
         FROM lancamentos l JOIN servicos s ON s.id=l.servico_id JOIN clientes c ON c.id=s.cliente_id
         WHERE l.id={$id}"
    )->fetch();
    if (!$row) {
        return false;
    }
    $row['funcionarios'] = db()->query(
        "SELECT lf.*, f.nome AS funcionario_nome FROM lancamento_funcionarios lf
         JOIN funcionarios f ON f.id=lf.funcionario_id WHERE lf.lancamento_id={$id}"
    )->fetchAll();
    $row['extras'] = db()->query(
        "SELECT id, chave, valor FROM lancamento_extras WHERE lancamento_id={$id}"
    )->fetchAll();
    return $row;
}

if ($method === 'GET') {
    $row = fetch_lancamento($id);
    if (!$row) {
        json_error('Lançamento não encontrado', 404);
    }
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE lancamentos SET servico_id=:sid, os=:os, data=:data, competencia=:comp, categoria_folha=:catfolha,
             is_domingo=:isdom, is_feriado=:isferia, nome_feriado=:nomeferia,
             horas_trabalhadas=:ht, km_rodados=:km, pedagio=:ped, outros=:outros, batida_extra=:batida,
             horas_extras=:hext, km_extras=:kext,
             extra_horas_fatura=:hef, extra_km_fatura=:kef, adic_dom_fatura=:adf,
             extra_horas_paga=:hep, extra_km_pago=:kep, adic_dom_pago=:adp,
             pedagio_fatura=:pedf, pedagio_reembolso=:pedr,
             total_fatura=:tfat, total_pago=:tpago, aliquota_aplicada=:aliq, imposto=:imp, lucro=:lucro,
             status=:status, observacao=:obs
             WHERE id=:id'
        );
        $stmt->execute([
            ':sid'    => (int) $d['servico_id'],
            ':os'     => $d['os'] ?: null,
            ':data'   => $d['data'],
            ':comp'   => $d['competencia'] ?: null,
            ':catfolha' => $d['categoria_folha'] ?: null,
            ':isdom'  => (int) ($d['is_domingo'] ?? 0),
            ':isferia'=> (int) ($d['is_feriado'] ?? 0),
            ':nomeferia' => $d['nome_feriado'] ?: null,
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
            ':id'     => $id,
        ]);

        // Substituir funcionários
        if (isset($d['funcionarios'])) {
            $pdo->exec("DELETE FROM lancamento_funcionarios WHERE lancamento_id={$id}");
            if (!empty($d['funcionarios'])) {
                $sfunc = $pdo->prepare(
                    'INSERT INTO lancamento_funcionarios (lancamento_id, funcionario_id, papel, participacao_percentual)
                     VALUES (:lid, :fid, :papel, :perc)'
                );
                foreach ($d['funcionarios'] as $f) {
                    $sfunc->execute([
                        ':lid'  => $id,
                        ':fid'  => (int) $f['funcionario_id'],
                        ':papel'=> $f['papel'] ?? null,
                        ':perc' => $f['participacao_percentual'] ?? 100,
                    ]);
                }
            }
        }

        // Substituir extras
        if (isset($d['extras'])) {
            $pdo->exec("DELETE FROM lancamento_extras WHERE lancamento_id={$id}");
            if (!empty($d['extras'])) {
                $sext = $pdo->prepare(
                    'INSERT INTO lancamento_extras (lancamento_id, chave, valor) VALUES (:lid, :chave, :valor)'
                );
                foreach ($d['extras'] as $e) {
                    $sext->execute([':lid' => $id, ':chave' => $e['chave'], ':valor' => $e['valor']]);
                }
            }
        }

        $pdo->commit();
        json_response(fetch_lancamento($id));
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

if ($method === 'DELETE') {
    $stmt = db()->prepare("DELETE FROM lancamentos WHERE id=:id");
    $stmt->execute([':id' => $id]);
    json_response(['deleted' => $id]);
}

json_error('Método não permitido', 405);
