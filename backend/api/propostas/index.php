<?php
/**
 * /api/propostas/ — listagem (GET) e criação (POST)
 *
 * Resposta inclui `numero_formatado` ('P-0042') além de `numero` (42).
 * Itens da proposta entram no payload via `itens` (array).
 *
 * Auth: requer permissão 'propostas' (auto: GET=read, POST=create).
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('propostas');
$method = $_SERVER['REQUEST_METHOD'];

/* ----------------------------------------------------------------------
 * Helpers internos
 * --------------------------------------------------------------------- */

function fetch_proposta_completa(int $id): ?array
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
    if (!$p) return null;

    $itens = db()->prepare('SELECT * FROM proposta_itens WHERE proposta_id = :pid ORDER BY ordem ASC, id ASC');
    $itens->execute([':pid' => $id]);
    $p['itens'] = $itens->fetchAll();

    return $p;
}

function next_proposta_numero(): int
{
    // SELECT MAX em transação (suficiente pra 2-5 usuários simultâneos do MRSys).
    // Para volume maior, trocar por tabela `contadores` com SELECT FOR UPDATE.
    $row = db()->query('SELECT COALESCE(MAX(numero), 0) AS m FROM propostas')->fetch();
    return ((int) ($row['m'] ?? 0)) + 1;
}

/* ----------------------------------------------------------------------
 * GET /api/propostas/?status=...&categoria=...&cliente_id=...&q=...
 * --------------------------------------------------------------------- */

if ($method === 'GET') {
    $where  = [];
    $params = [];

    if (!empty($_GET['status']) && $_GET['status'] !== 'todos') {
        $where[] = 'p.status = :status';
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['categoria'])) {
        $where[] = 'p.categoria = :cat';
        $params[':cat'] = $_GET['categoria'];
    }
    if (!empty($_GET['cliente_id'])) {
        $where[] = 'p.cliente_id = :cid';
        $params[':cid'] = (int) $_GET['cliente_id'];
    }
    if (!empty($_GET['q'])) {
        $where[] = '(p.cliente_nome LIKE :q OR p.cliente_cnpj LIKE :q OR CAST(p.numero AS CHAR) LIKE :q)';
        $params[':q'] = '%' . $_GET['q'] . '%';
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $sql = "SELECT p.*,
                   CONCAT('P-', LPAD(p.numero, 4, '0')) AS numero_formatado,
                   c.razao_social AS cliente_razao,
                   (SELECT COUNT(*) FROM proposta_itens pi WHERE pi.proposta_id = p.id) AS qtd_itens
              FROM propostas p
         LEFT JOIN clientes c ON c.id = p.cliente_id
              {$whereClause}
          ORDER BY p.criado_em DESC, p.id DESC";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Carrega itens de todas as propostas numa única query (evita N+1)
    if ($rows) {
        $ids = implode(',', array_map('intval', array_column($rows, 'id')));
        $allItens = db()->query(
            "SELECT * FROM proposta_itens WHERE proposta_id IN ({$ids}) ORDER BY proposta_id, ordem ASC, id ASC"
        )->fetchAll();
        $itensPorProposta = [];
        foreach ($allItens as $it) {
            $itensPorProposta[(int)$it['proposta_id']][] = $it;
        }
        foreach ($rows as &$r) {
            $r['itens'] = $itensPorProposta[(int)$r['id']] ?? [];
        }
        unset($r);
    }

    json_response($rows);
}

/* ----------------------------------------------------------------------
 * POST /api/propostas/  — cria proposta + itens
 *
 * Payload:
 *   {
 *     cliente_id?: int,
 *     cliente_nome?: string,
 *     cliente_cnpj: string (obrigatório),
 *     cliente_email?: string,
 *     categoria: 'ESCOLTA' | 'FACILITIES',
 *     condicoes_comerciais?, condicoes_faturamento?, prazos?, vencimento?, observacoes?,
 *     itens: [
 *       { descricao, quantidade, valor_unitario, valor_total, efetivo?, escala?,
 *         servico_origem_id?, template?, categoria_servico? }
 *     ]
 *   }
 * --------------------------------------------------------------------- */

if ($method === 'POST') {
    $d    = json_input();
    $user = current_user();

    if (empty($d['cliente_cnpj']))  json_error('Campo obrigatório: cliente_cnpj', 422);
    if (empty($d['categoria']))     json_error('Campo obrigatório: categoria', 422);

    $categoria = strtoupper(trim((string) $d['categoria']));
    if (!in_array($categoria, ['ESCOLTA', 'FACILITIES', 'EVENTOS', 'OUTROS'], true)) {
        json_error("categoria inválida ('ESCOLTA', 'FACILITIES', 'EVENTOS' ou 'OUTROS')", 422);
    }

    $itens = is_array($d['itens'] ?? null) ? $d['itens'] : [];

    db()->beginTransaction();
    try {
        $numero = next_proposta_numero();

        $stmt = db()->prepare(
            'INSERT INTO propostas
             (numero, cliente_id, cliente_nome, cliente_cnpj, cliente_email,
              categoria, prestador, status, condicoes_comerciais, condicoes_faturamento,
              prazos, vencimento, observacoes, valor_total, criado_por)
             VALUES
             (:num, :cid, :cnome, :ccnpj, :cmail,
              :cat, :prest, :st, :cond, :condf,
              :prazos, :venc, :obs, :total, :uid)'
        );

        $valorTotal = 0.0;
        foreach ($itens as $it) {
            $valorTotal += (float) ($it['valor_total'] ?? 0);
        }

        $stmt->execute([
            ':num'    => $numero,
            ':cid'    => !empty($d['cliente_id']) ? (int) $d['cliente_id'] : null,
            ':cnome'  => $d['cliente_nome']  ?? null,
            ':ccnpj'  => $d['cliente_cnpj'],
            ':cmail'  => $d['cliente_email'] ?? null,
            ':cat'    => $categoria,
            ':prest'  => $d['prestador'] ?? null,
            ':st'     => 'Criada',
            ':cond'   => $d['condicoes_comerciais']  ?? null,
            ':condf'  => $d['condicoes_faturamento'] ?? null,
            ':prazos' => $d['prazos']     ?? null,
            ':venc'   => $d['vencimento'] ?? null,
            ':obs'    => $d['observacoes']?? null,
            ':total'  => round($valorTotal, 2),
            ':uid'    => $user['id'],
        ]);
        $propostaId = (int) db()->lastInsertId();

        if ($itens) {
            $insIt = db()->prepare(
                'INSERT INTO proposta_itens
                 (proposta_id, ordem, descricao, quantidade, valor_unitario, valor_total,
                  efetivo, escala, servico_origem_id, template, categoria_servico,
                  franquia_horas, franquia_km, hora_extra_fatura, km_extra_fatura,
                  adicional_domingos_fatura, aliquota)
                 VALUES
                 (:pid, :ordem, :desc, :qtd, :vu, :vt,
                  :ef, :esc, :sid, :tpl, :catsvc,
                  :fh, :fk, :hef, :kef, :ad, :aliq)'
            );
            foreach ($itens as $i => $it) {
                $insIt->execute([
                    ':pid'    => $propostaId,
                    ':ordem'  => (int) ($it['ordem'] ?? $i),
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
                ]);
            }
        }

        db()->commit();
        json_response(fetch_proposta_completa($propostaId), 201);
    } catch (Throwable $e) {
        db()->rollBack();
        json_error('[DEBUG] ' . $e->getMessage() . ' | ' . basename($e->getFile()) . ':' . $e->getLine(), 500);
    }
}

json_error('Método não permitido', 405);
