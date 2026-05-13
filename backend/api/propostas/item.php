<?php
/**
 * /api/propostas/item.php?id=NN — GET / PUT / PATCH / DELETE
 *
 * GET    → retorna a proposta com itens
 * PUT    → atualiza cabeçalho + substitui itens (delete-all + insert)
 *          regras de status:
 *            - propostas Aceitas viram imutáveis (snapshot_aceito é a verdade)
 *            - mudar status → 'Enviada' gera token UUID + token_expira_em (30d)
 *            - mudar status → 'Aceita'/'Rejeitada' diretamente exige uso de aceitar.php (público)
 *              ou da rota interna PATCH com motivo (ver abaixo)
 * PATCH  → mudança apenas de status (sem reescrever itens). Útil para mover entre estados internos.
 * DELETE → exclusão lógica (atualiza status para 'Rejeitada' com motivo) — propostas nunca somem.
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('propostas');
$method = $_SERVER['REQUEST_METHOD'];

$id = (int) ($_GET['id'] ?? 0);
if (!$id) json_error('ID inválido', 400);

function load_proposta(int $id): array
{
    $stmt = db()->prepare(
        "SELECT p.*,
                CONCAT('P-', LPAD(p.numero, 4, '0')) AS numero_formatado,
                c.razao_social AS cliente_razao
           FROM propostas p
      LEFT JOIN clientes c ON c.id = p.cliente_id
          WHERE p.id = :id"
    );
    $stmt->execute([':id' => $id]);
    $p = $stmt->fetch();
    if (!$p) json_error('Proposta não encontrada', 404);

    $itens = db()->prepare('SELECT * FROM proposta_itens WHERE proposta_id = :pid ORDER BY ordem ASC, id ASC');
    $itens->execute([':pid' => $id]);
    $p['itens'] = $itens->fetchAll();
    return $p;
}

function uuid_v4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

/* ---------- GET ---------- */
if ($method === 'GET') {
    json_response(load_proposta($id));
}

/* ---------- PUT (atualizar cabeçalho + itens) ---------- */
if ($method === 'PUT') {
    $current = load_proposta($id);
    if ($current['status'] === 'Aceita') {
        json_error('Proposta aceita é imutável', 409);
    }

    $d = json_input();
    if (empty($d['cliente_cnpj'])) json_error('Campo obrigatório: cliente_cnpj', 422);
    if (empty($d['categoria']))    json_error('Campo obrigatório: categoria', 422);

    $categoria = strtoupper(trim((string) $d['categoria']));
    if (!in_array($categoria, ['ESCOLTA', 'FACILITIES', 'OUTROS'], true)) {
        json_error("categoria inválida ('ESCOLTA', 'FACILITIES' ou 'OUTROS')", 422);
    }

    $novoStatus = $d['status'] ?? $current['status'];
    if (!in_array($novoStatus, ['Criada', 'Enviada', 'Em análise', 'Aceita', 'Rejeitada'], true)) {
        json_error('Status inválido', 422);
    }
    // Não permitir mudar para Aceita/Rejeitada via PUT interno (use aceitar.php / PATCH com motivo)
    if (in_array($novoStatus, ['Aceita', 'Rejeitada'], true) && $novoStatus !== $current['status']) {
        json_error('Use o endpoint público de aceite ou PATCH para Aceita/Rejeitada', 409);
    }

    $itens = is_array($d['itens'] ?? null) ? $d['itens'] : [];
    $valorTotal = 0.0;
    foreach ($itens as $it) $valorTotal += (float) ($it['valor_total'] ?? 0);

    db()->beginTransaction();
    try {
        // Geração de token quando passa de Criada → Enviada (ou re-Envia)
        $token         = $current['token'];
        $tokenExpira   = $current['token_expira_em'];
        $dataEnvio     = $current['data_envio'];
        if ($novoStatus === 'Enviada' && empty($current['token'])) {
            $token       = uuid_v4();
            $tokenExpira = date('Y-m-d H:i:s', time() + 30 * 86400);
            $dataEnvio   = date('Y-m-d H:i:s');
        }

        $stmt = db()->prepare(
            'UPDATE propostas SET
                cliente_id            = :cid,
                cliente_nome          = :cnome,
                cliente_cnpj          = :ccnpj,
                cliente_email         = :cmail,
                categoria             = :cat,
                prestador             = :prest,
                status                = :st,
                condicoes_comerciais  = :cond,
                condicoes_faturamento = :condf,
                prazos                = :prazos,
                vencimento            = :venc,
                observacoes           = :obs,
                valor_total           = :total,
                token                 = :tok,
                token_expira_em       = :texp,
                data_envio            = :denv
              WHERE id = :id'
        );
        $stmt->execute([
            ':cid'    => !empty($d['cliente_id']) ? (int) $d['cliente_id'] : null,
            ':cnome'  => $d['cliente_nome']  ?? null,
            ':ccnpj'  => $d['cliente_cnpj'],
            ':cmail'  => $d['cliente_email'] ?? null,
            ':cat'    => $categoria,
            ':prest'  => $d['prestador'] ?? null,
            ':st'     => $novoStatus,
            ':cond'   => $d['condicoes_comerciais']  ?? null,
            ':condf'  => $d['condicoes_faturamento'] ?? null,
            ':prazos' => $d['prazos']     ?? null,
            ':venc'   => $d['vencimento'] ?? null,
            ':obs'    => $d['observacoes']?? null,
            ':total'  => round($valorTotal, 2),
            ':tok'    => $token,
            ':texp'   => $tokenExpira,
            ':denv'   => $dataEnvio,
            ':id'     => $id,
        ]);

        // Substituição dos itens (delete-all + insert).
        // Preserva apenas conversões já feitas para o catálogo: se item original tinha
        // servico_id (já convertido), mantemos a referência via lookup pelo `ordem` quando reaplicar.
        $convertidos = db()->prepare(
            'SELECT ordem, servico_id, convertido_em FROM proposta_itens
              WHERE proposta_id = :pid AND servico_id IS NOT NULL'
        );
        $convertidos->execute([':pid' => $id]);
        $mapa = [];
        foreach ($convertidos->fetchAll() as $r) {
            $mapa[(int) $r['ordem']] = ['svc' => (int) $r['servico_id'], 'em' => $r['convertido_em']];
        }

        db()->prepare('DELETE FROM proposta_itens WHERE proposta_id = :pid')
           ->execute([':pid' => $id]);

        if ($itens) {
            $insIt = db()->prepare(
                'INSERT INTO proposta_itens
                 (proposta_id, ordem, descricao, quantidade, valor_unitario, valor_total,
                  efetivo, escala, servico_origem_id, template, categoria_servico,
                  franquia_horas, franquia_km, hora_extra_fatura, km_extra_fatura,
                  adicional_domingos_fatura, aliquota,
                  servico_id, convertido_em)
                 VALUES
                 (:pid, :ordem, :desc, :qtd, :vu, :vt,
                  :ef, :esc, :sid, :tpl, :catsvc,
                  :fh, :fk, :hef, :kef, :ad, :aliq,
                  :svcid, :conv)'
            );
            foreach ($itens as $i => $it) {
                $ordem = (int) ($it['ordem'] ?? $i);
                $svcId = $mapa[$ordem]['svc'] ?? null;
                $svcEm = $mapa[$ordem]['em']  ?? null;
                $insIt->execute([
                    ':pid'    => $id,
                    ':ordem'  => $ordem,
                    ':desc'   => $it['descricao'] ?? '',
                    ':qtd'    => (float) ($it['quantidade'] ?? 1),
                    ':vu'     => (float) ($it['valor_unitario'] ?? 0),
                    ':vt'     => (float) ($it['valor_total'] ?? 0),
                    ':ef'     => isset($it['efetivo']) && $it['efetivo'] !== '' ? (int) $it['efetivo'] : null,
                    ':esc'    => $it['escala'] ?? null,
                    ':sid'    => !empty($it['servico_origem_id']) ? (int) $it['servico_origem_id'] : null,
                    ':tpl'    => $it['template']          ?? null,
                    ':catsvc' => $it['categoria_servico'] ?? null,
                    ':fh'     => (float) ($it['franquia_horas']            ?? 0),
                    ':fk'     => (float) ($it['franquia_km']               ?? 0),
                    ':hef'    => (float) ($it['hora_extra_fatura']         ?? 0),
                    ':kef'    => (float) ($it['km_extra_fatura']           ?? 0),
                    ':ad'     => (float) ($it['adicional_domingos_fatura'] ?? 0),
                    ':aliq'   => (float) ($it['aliquota']                  ?? 0),
                    ':svcid'  => $svcId,
                    ':conv'   => $svcEm,
                ]);
            }
        }

        db()->commit();
        json_response(load_proposta($id));
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
}

/* ---------- PATCH (mudança apenas de status) ---------- */
if ($method === 'PATCH') {
    $current = load_proposta($id);
    if ($current['status'] === 'Aceita') {
        json_error('Proposta aceita é imutável', 409);
    }

    $d = json_input();
    $novoStatus = $d['status'] ?? null;
    if (!in_array($novoStatus, ['Criada', 'Enviada', 'Em análise', 'Aceita', 'Rejeitada'], true)) {
        json_error('Status inválido', 422);
    }

    // Aceita interna (sem aceite virtual) só por admin — útil para registrar aceite presencial
    if ($novoStatus === 'Aceita') {
        $u = current_user();
        if (($u['perfil_codigo'] ?? '') !== 'admin') {
            json_error('Apenas admin pode marcar como Aceita internamente', 403);
        }
        $stmt = db()->prepare(
            "UPDATE propostas
                SET status='Aceita',
                    data_aceite=:da,
                    snapshot_aceito = JSON_OBJECT('manual', 1, 'usuario_id', :uid)
              WHERE id = :id"
        );
        $stmt->execute([':da' => date('Y-m-d H:i:s'), ':uid' => $u['id'], ':id' => $id]);
        json_response(load_proposta($id));
    }

    if ($novoStatus === 'Rejeitada') {
        $motivo = $d['motivo_rejeicao'] ?? null;
        $stmt = db()->prepare(
            "UPDATE propostas SET status='Rejeitada', motivo_rejeicao=:m WHERE id=:id"
        );
        $stmt->execute([':m' => $motivo, ':id' => $id]);
        json_response(load_proposta($id));
    }

    // Caso geral (Criada / Enviada / Em análise) — gera token se for primeira ida pra Enviada
    $token       = $current['token'];
    $tokenExpira = $current['token_expira_em'];
    $dataEnvio   = $current['data_envio'];
    if ($novoStatus === 'Enviada' && empty($current['token'])) {
        $token       = uuid_v4();
        $tokenExpira = date('Y-m-d H:i:s', time() + 30 * 86400);
        $dataEnvio   = date('Y-m-d H:i:s');
    }
    $stmt = db()->prepare(
        'UPDATE propostas
            SET status=:st, token=:tok, token_expira_em=:texp, data_envio=:denv
          WHERE id=:id'
    );
    $stmt->execute([
        ':st'   => $novoStatus,
        ':tok'  => $token,
        ':texp' => $tokenExpira,
        ':denv' => $dataEnvio,
        ':id'   => $id,
    ]);
    json_response(load_proposta($id));
}

/* ---------- DELETE (exclusão lógica) ---------- */
if ($method === 'DELETE') {
    $stmt = db()->prepare(
        "UPDATE propostas SET status='Rejeitada',
                              motivo_rejeicao = COALESCE(motivo_rejeicao, 'Excluída pelo usuário')
          WHERE id=:id"
    );
    $stmt->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'Rejeitada']);
}

json_error('Método não permitido', 405);
