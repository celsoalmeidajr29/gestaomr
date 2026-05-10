<?php
/**
 * /api/parcelas/criar.php — POST
 *
 * Cria um parcelamento completo (N parcelas em competências consecutivas)
 * em transação atômica. Aceita 3 entidades-alvo: 'despesas', 'despesas_chefia',
 * 'descontos'.
 *
 * Payload:
 * {
 *   entidade: 'despesas' | 'despesas_chefia' | 'descontos',  // obrigatório
 *   parcela_total: int (>=2),                                // obrigatório
 *   valor_parcela: number,                                   // obrigatório (valor de CADA parcela)
 *   competencia_inicial: 'AAAA-MM',                          // obrigatório (1ª parcela)
 *   data_inicial: 'YYYY-MM-DD',                              // opcional (default null)
 *   descricao: string,                                       // obrigatório p/ despesas/chefia
 *   alvo_nome: string,                                       // obrigatório p/ descontos
 *   ...campos extras conforme entidade (origem, tipo_vale, observacoes, etc)
 * }
 *
 * Resposta: { grupo_parcela_id, parcelas_criadas, ids: [int], resumo: {...} }
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$d = json_input();
$entidade = (string) ($d['entidade'] ?? '');
$meta = parcela_entidade_meta($entidade);

require_permission($meta['permissao']);

$user = current_user();

$parcelaTotal = (int) ($d['parcela_total'] ?? 0);
$valorParc    = (float) ($d['valor_parcela'] ?? 0);
$compInicial  = trim((string) ($d['competencia_inicial'] ?? ''));
$dataInicial  = !empty($d['data_inicial']) ? (string) $d['data_inicial'] : null;

if ($parcelaTotal < 2) json_error('parcela_total deve ser >= 2', 422);
if ($parcelaTotal > 360) json_error('parcela_total muito alto (máx 360)', 422);
if ($valorParc <= 0)   json_error('valor_parcela deve ser > 0', 422);
if (!preg_match('/^\d{4}-\d{2}$/', $compInicial)) {
    json_error('competencia_inicial inválida (AAAA-MM)', 422);
}

$descricao = trim((string) ($d['descricao'] ?? ''));
$alvoNome  = trim((string) ($d['alvo_nome']  ?? ''));

if ($entidade === 'descontos') {
    if ($alvoNome === '') json_error('alvo_nome obrigatório para descontos', 422);
} else {
    if ($descricao === '') json_error('descricao obrigatória', 422);
}

$grupoId = parcela_uuid_v4();
$ids = [];

db()->beginTransaction();
try {
    if ($entidade === 'despesas') {
        $stmt = db()->prepare(
            'INSERT INTO despesas
             (descricao, competencia, tipo, valor, centro_custo, origem,
              data_lancamento, parcela_atual, parcela_total, grupo_parcela_id,
              status, observacoes, criado_por)
             VALUES
             (:desc, :comp, "PARCELA", :valor, :cc, :origem,
              :dl, :pa, :pt, :gid,
              "pendente", :obs, :uid)'
        );
        for ($i = 1; $i <= $parcelaTotal; $i++) {
            $stmt->execute([
                ':desc'   => $descricao,
                ':comp'   => parcela_competencia_proxima($compInicial, $i - 1),
                ':valor'  => $valorParc,
                ':cc'     => $d['centro_custo'] ?? null,
                ':origem' => $d['origem']        ?? null,
                ':dl'     => parcela_data_proxima($dataInicial, $i - 1),
                ':pa'     => $i,
                ':pt'     => $parcelaTotal,
                ':gid'    => $grupoId,
                ':obs'    => $d['observacoes']   ?? null,
                ':uid'    => $user['id'],
            ]);
            $ids[] = (int) db()->lastInsertId();
        }
    } elseif ($entidade === 'despesas_chefia') {
        $origem = strtoupper(trim((string) ($d['origem'] ?? 'MANHÃES')));
        if (!in_array($origem, ['MANHÃES', 'RICARDO'], true)) $origem = 'MANHÃES';

        $stmt = db()->prepare(
            'INSERT INTO despesas_chefia
             (descricao, competencia, tipo, valor, origem,
              data_lancamento, parcela_atual, parcela_total, grupo_parcela_id,
              status, observacoes, criado_por)
             VALUES
             (:desc, :comp, "PARCELA", :valor, :origem,
              :dl, :pa, :pt, :gid,
              "pendente", :obs, :uid)'
        );
        for ($i = 1; $i <= $parcelaTotal; $i++) {
            $stmt->execute([
                ':desc'   => $descricao,
                ':comp'   => parcela_competencia_proxima($compInicial, $i - 1),
                ':valor'  => $valorParc,
                ':origem' => $origem,
                ':dl'     => parcela_data_proxima($dataInicial, $i - 1),
                ':pa'     => $i,
                ':pt'     => $parcelaTotal,
                ':gid'    => $grupoId,
                ':obs'    => $d['observacoes']   ?? null,
                ':uid'    => $user['id'],
            ]);
            $ids[] = (int) db()->lastInsertId();
        }
    } else { // descontos
        $tipoVale = trim((string) ($d['tipo_vale'] ?? 'VALE'));
        $funcId   = !empty($d['funcionario_id']) ? (int) $d['funcionario_id'] : null;

        $stmt = db()->prepare(
            'INSERT INTO descontos
             (funcionario_id, alvo_nome, competencia, tipo_vale,
              tipo, parcela_atual, parcela_total, status, grupo_parcela_id,
              valor, centro_custo, forma_pagamento, data, observacoes, criado_por)
             VALUES
             (:fid, :alvo, :comp, :tv,
              "PARCELA", :pa, :pt, "pendente", :gid,
              :valor, :cc, :fp, :data, :obs, :uid)'
        );
        for ($i = 1; $i <= $parcelaTotal; $i++) {
            $stmt->execute([
                ':fid'   => $funcId,
                ':alvo'  => $alvoNome,
                ':comp'  => parcela_competencia_proxima($compInicial, $i - 1),
                ':tv'    => $tipoVale,
                ':pa'    => $i,
                ':pt'    => $parcelaTotal,
                ':gid'   => $grupoId,
                ':valor' => $valorParc,
                ':cc'    => $d['centro_custo']    ?? null,
                ':fp'    => $d['forma_pagamento'] ?? null,
                ':data'  => parcela_data_proxima($dataInicial, $i - 1),
                ':obs'   => $d['observacoes']     ?? null,
                ':uid'   => $user['id'],
            ]);
            $ids[] = (int) db()->lastInsertId();
        }
    }

    db()->commit();
} catch (Throwable $e) {
    db()->rollBack();
    throw $e;
}

$resumo = parcela_grupo_resumo($meta['tabela'], $grupoId);

json_response([
    'entidade'         => $entidade,
    'grupo_parcela_id' => $grupoId,
    'parcelas_criadas' => count($ids),
    'ids'              => $ids,
    'resumo'           => $resumo,
], 201);
