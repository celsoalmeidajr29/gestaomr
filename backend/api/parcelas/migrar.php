<?php
/**
 * /api/parcelas/migrar.php — POST one-shot (executar uma vez por entidade)
 *
 * Body (opcional):
 *   { entidade: 'despesas'|'despesas_chefia'|'descontos', dry_run?: bool }
 *
 * Heurística de agrupamento:
 *   Considera "mesma série" qualquer registro com:
 *     - tipo='PARCELA' (ou tipo_vale + parcela_total preenchidos no caso de descontos legacy)
 *     - parcela_atual e parcela_total > 0
 *     - mesma normalizar(descricao) (ou alvo_nome em descontos)
 *     - mesmo valor (igualdade exata em DECIMAL)
 *     - mesmo parcela_total
 *     - mesmo col_alvo (origem | alvo_nome) ou ambos NULL
 *   E que ainda NÃO tenham grupo_parcela_id atribuído.
 *
 *   Para cada grupo:
 *     1) Atribui um UUID v4 às parcelas existentes
 *     2) Cria as parcelas faltantes (de MAX(parcela_atual)+1 até parcela_total)
 *        em competências consecutivas a partir da maior competência conhecida,
 *        com status='pendente'
 *
 * Anomalias relatadas (NÃO migradas — usuário decide na mão):
 *   - Grupo onde parcela_atual não é sequencial (ex: 1 e 3, faltando 2)
 *   - Grupo onde competências não são consecutivas
 *   - Mais de 1 registro com mesmo (parcela_atual, descricao+valor+total) → ambíguo
 *
 * Retorna: { entidade, dry_run, grupos_processados, parcelas_atualizadas,
 *            parcelas_criadas, anomalias: [...] }
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

// Aceita migração só por admin (operação destrutiva — cria muitas linhas)
$user = current_user();
if (($user['perfil_codigo'] ?? '') !== 'admin') {
    json_error('Apenas admin pode executar migração de parcelas', 403);
}

$dryRun = !empty($d['dry_run']);

$tabela        = $meta['tabela'];
$colCompetencia= $meta['col_competencia'];
$colData       = $meta['col_data'];
$colAlvo       = $meta['col_alvo'];
$tipoParc      = $meta['tipo_parcela'];

// Em descontos, o tipo legacy era apenas string — agora migration 012 adicionou tipo='AVULSO'/'PARCELA'.
// Para identificar parcelas legacy em descontos, aceitamos parcela_atual + parcela_total preenchidos.
$wherePrincipal = ($tabela === 'descontos')
    ? "(tipo = 'PARCELA' OR (parcela_atual IS NOT NULL AND parcela_total IS NOT NULL))"
    : "tipo = '{$tipoParc}'";

/* --------------------------------------------------------------------
 * 1) Carrega todas as parcelas órfãs (sem grupo_parcela_id) e agrupa
 * ------------------------------------------------------------------ */
$colDescricao = ($tabela === 'descontos') ? 'alvo_nome' : 'descricao';

$sql = "SELECT * FROM {$tabela}
         WHERE grupo_parcela_id IS NULL
           AND {$wherePrincipal}
           AND parcela_atual IS NOT NULL
           AND parcela_total IS NOT NULL
           AND parcela_total > 0
      ORDER BY {$colDescricao} ASC, valor ASC, parcela_total ASC, parcela_atual ASC";

$rows = db()->query($sql)->fetchAll();

if (empty($rows)) {
    json_response([
        'entidade'             => $entidade,
        'dry_run'              => $dryRun,
        'mensagem'             => 'Nenhuma parcela órfã encontrada — nada a migrar',
        'grupos_processados'   => 0,
        'parcelas_atualizadas' => 0,
        'parcelas_criadas'     => 0,
        'anomalias'            => [],
    ]);
}

/* --------------------------------------------------------------------
 * 2) Agrupa por (descricao normalizada + valor + parcela_total + alvo)
 * ------------------------------------------------------------------ */
function normalizar_str(?string $s): string
{
    if ($s === null) return '';
    $s = mb_strtolower(trim($s), 'UTF-8');
    return preg_replace('/\s+/u', ' ', $s);
}

$grupos = [];
foreach ($rows as $r) {
    $key = implode('|', [
        normalizar_str($r[$colDescricao] ?? null),
        number_format((float) $r['valor'], 2, '.', ''),
        (int) $r['parcela_total'],
        normalizar_str($r[$colAlvo] ?? null),
    ]);
    $grupos[$key] ??= [];
    $grupos[$key][] = $r;
}

/* --------------------------------------------------------------------
 * 3) Para cada grupo: detecta anomalias e cria parcelas faltantes
 * ------------------------------------------------------------------ */
$anomalias = [];
$gruposProcessados = 0;
$parcelasAtualizadas = 0;
$parcelasCriadas = 0;
$gruposCriados = [];

if (!$dryRun) db()->beginTransaction();
try {
    foreach ($grupos as $key => $grupoRows) {
        // Ordena por parcela_atual
        usort($grupoRows, fn($a, $b) => ((int)$a['parcela_atual']) <=> ((int)$b['parcela_atual']));

        $parcelaTotal   = (int) $grupoRows[0]['parcela_total'];
        $parcelaAtuais  = array_map(fn($r) => (int) $r['parcela_atual'], $grupoRows);
        $duplicadas     = count($parcelaAtuais) !== count(array_unique($parcelaAtuais));

        if ($duplicadas) {
            $anomalias[] = [
                'tipo'     => 'parcela_atual_duplicada',
                'chave'    => $key,
                'qtd_rows' => count($grupoRows),
                'parcelas_atuais' => $parcelaAtuais,
                'mensagem' => 'Há mais de uma linha com a mesma parcela_atual — ambíguo, ignorado',
            ];
            continue;
        }

        // Verifica se a sequência tem buracos (ex: 1, 3, 4 — falta a 2)
        $maxParcelaAtual = max($parcelaAtuais);
        $minParcelaAtual = min($parcelaAtuais);
        $esperado = range($minParcelaAtual, $maxParcelaAtual);
        $faltantesNoMeio = array_values(array_diff($esperado, $parcelaAtuais));

        if (!empty($faltantesNoMeio)) {
            $anomalias[] = [
                'tipo'              => 'parcelas_intermediarias_faltando',
                'chave'             => $key,
                'parcelas_atuais'   => $parcelaAtuais,
                'faltantes_no_meio' => $faltantesNoMeio,
                'mensagem'          => 'Sequência tem buracos — admin precisa decidir se cria essas parcelas no meio',
            ];
            // Mesmo com buraco no meio, ainda podemos criar as faltantes do FIM (de max+1 até parcela_total).
            // Não bloqueia a migração.
        }

        // Verifica continuidade das competências (entre parcela_atual N e N+1)
        // Apenas warning informativo — não bloqueia
        $competenciaPorParcela = [];
        foreach ($grupoRows as $r) {
            $competenciaPorParcela[(int) $r['parcela_atual']] = (string) $r[$colCompetencia];
        }

        $gid = parcela_uuid_v4();

        // Atribui o UUID a todas as parcelas existentes do grupo
        if (!$dryRun) {
            $upd = db()->prepare("UPDATE {$tabela} SET grupo_parcela_id = :gid WHERE id = :id");
            foreach ($grupoRows as $r) {
                $upd->execute([':gid' => $gid, ':id' => (int) $r['id']]);
                $parcelasAtualizadas++;
            }
        } else {
            $parcelasAtualizadas += count($grupoRows);
        }

        // Calcula parcelas faltantes do final (max+1 até parcela_total)
        $faltantesFim = [];
        for ($i = $maxParcelaAtual + 1; $i <= $parcelaTotal; $i++) {
            $faltantesFim[] = $i;
        }

        if (empty($faltantesFim)) {
            $gruposProcessados++;
            $gruposCriados[] = [
                'grupo_parcela_id'        => $gid,
                'descricao'               => $grupoRows[0][$colDescricao] ?? '',
                'parcelas_total'          => $parcelaTotal,
                'parcelas_existentes'     => count($grupoRows),
                'parcelas_criadas_no_fim' => 0,
            ];
            continue;
        }

        // Pega a última parcela conhecida pra inferir competência base e copiar campos
        $ultima = $grupoRows[count($grupoRows) - 1];
        $compBase = (string) $ultima[$colCompetencia];
        $dataBase = !empty($ultima[$colData]) ? (string) $ultima[$colData] : null;

        if (!$dryRun) {
            // Insert SQL específico por entidade
            if ($tabela === 'despesas') {
                $insSql = 'INSERT INTO despesas
                    (descricao, competencia, tipo, valor, centro_custo, origem,
                     data_lancamento, parcela_atual, parcela_total, grupo_parcela_id,
                     status, observacoes, criado_por)
                    VALUES
                    (:desc, :comp, "PARCELA", :valor, :cc, :origem,
                     :dl, :pa, :pt, :gid, "pendente", :obs, :uid)';
            } elseif ($tabela === 'despesas_chefia') {
                $insSql = 'INSERT INTO despesas_chefia
                    (descricao, competencia, tipo, valor, origem,
                     data_lancamento, parcela_atual, parcela_total, grupo_parcela_id,
                     status, observacoes, criado_por)
                    VALUES
                    (:desc, :comp, "PARCELA", :valor, :origem,
                     :dl, :pa, :pt, :gid, "pendente", :obs, :uid)';
            } else { // descontos
                $insSql = 'INSERT INTO descontos
                    (funcionario_id, alvo_nome, competencia, tipo_vale,
                     tipo, parcela_atual, parcela_total, status, grupo_parcela_id,
                     valor, centro_custo, forma_pagamento, data, observacoes, criado_por)
                    VALUES
                    (:fid, :alvo, :comp, :tv,
                     "PARCELA", :pa, :pt, "pendente", :gid,
                     :valor, :cc, :fp, :data, :obs, :uid)';
            }
            $ins = db()->prepare($insSql);

            foreach ($faltantesFim as $idx => $parcN) {
                $offset  = $parcN - $maxParcelaAtual; // 1, 2, 3...
                $compNew = parcela_competencia_proxima($compBase, $offset);
                $dataNew = parcela_data_proxima($dataBase, $offset);

                if ($tabela === 'despesas') {
                    $ins->execute([
                        ':desc'   => $ultima['descricao'],
                        ':comp'   => $compNew,
                        ':valor'  => $ultima['valor'],
                        ':cc'     => $ultima['centro_custo'] ?? null,
                        ':origem' => $ultima['origem']        ?? null,
                        ':dl'     => $dataNew,
                        ':pa'     => $parcN,
                        ':pt'     => $parcelaTotal,
                        ':gid'    => $gid,
                        ':obs'    => $ultima['observacoes']   ?? null,
                        ':uid'    => $user['id'],
                    ]);
                } elseif ($tabela === 'despesas_chefia') {
                    $ins->execute([
                        ':desc'   => $ultima['descricao'],
                        ':comp'   => $compNew,
                        ':valor'  => $ultima['valor'],
                        ':origem' => $ultima['origem'] ?? 'MANHÃES',
                        ':dl'     => $dataNew,
                        ':pa'     => $parcN,
                        ':pt'     => $parcelaTotal,
                        ':gid'    => $gid,
                        ':obs'    => $ultima['observacoes']   ?? null,
                        ':uid'    => $user['id'],
                    ]);
                } else { // descontos
                    $ins->execute([
                        ':fid'   => !empty($ultima['funcionario_id']) ? (int) $ultima['funcionario_id'] : null,
                        ':alvo'  => $ultima['alvo_nome'],
                        ':comp'  => $compNew,
                        ':tv'    => $ultima['tipo_vale'] ?? 'VALE',
                        ':pa'    => $parcN,
                        ':pt'    => $parcelaTotal,
                        ':gid'   => $gid,
                        ':valor' => $ultima['valor'],
                        ':cc'    => $ultima['centro_custo']    ?? null,
                        ':fp'    => $ultima['forma_pagamento'] ?? null,
                        ':data'  => $dataNew,
                        ':obs'   => $ultima['observacoes']     ?? null,
                        ':uid'   => $user['id'],
                    ]);
                }
                $parcelasCriadas++;
            }
        } else {
            $parcelasCriadas += count($faltantesFim);
        }

        $gruposProcessados++;
        $gruposCriados[] = [
            'grupo_parcela_id'        => $gid,
            'descricao'               => $grupoRows[0][$colDescricao] ?? '',
            'parcelas_total'          => $parcelaTotal,
            'parcelas_existentes'     => count($grupoRows),
            'parcelas_criadas_no_fim' => count($faltantesFim),
        ];
    }

    if (!$dryRun) db()->commit();
} catch (Throwable $e) {
    if (!$dryRun) db()->rollBack();
    throw $e;
}

json_response([
    'entidade'             => $entidade,
    'dry_run'              => $dryRun,
    'grupos_processados'   => $gruposProcessados,
    'parcelas_atualizadas' => $parcelasAtualizadas,
    'parcelas_criadas'     => $parcelasCriadas,
    'grupos'               => $gruposCriados,
    'anomalias'            => $anomalias,
]);
