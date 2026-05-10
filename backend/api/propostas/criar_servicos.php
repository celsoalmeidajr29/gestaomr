<?php
/**
 * /api/propostas/criar_servicos.php
 *
 * POST { proposta_id: int, itens: [{ id: int, codigo: string, ... }] }
 *
 * Apenas em propostas com status='Aceita'. Para cada item recebido, cria 1 entrada
 * em `servicos`. Marca o proposta_iten correspondente com servico_id + convertido_em.
 *
 * Itens já convertidos (servico_id != NULL) são pulados (idempotente).
 *
 * Os campos do servico podem vir no payload (override) ou são derivados do item:
 *   - codigo (obrigatório, único)
 *   - cliente_id (obrigatório)
 *   - template (default 'TOMBINI')
 *   - descricao (default = item.descricao)
 *   - categoria_servico (default = item.categoria_servico ou 'FACILITIES')
 *   - valor_fatura = item.valor_unitario
 *   - aliquota (default 0)
 *
 * Retorna: { criados: [{ item_id, servico_id }], pulados: [...], erros: [...] }
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('propostas');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido', 405);
}

$d = json_input();
$propostaId = (int) ($d['proposta_id'] ?? 0);
$itensReq   = is_array($d['itens'] ?? null) ? $d['itens'] : [];

if (!$propostaId)   json_error('proposta_id obrigatório', 422);
if (empty($itensReq)) json_error('Selecione ao menos um item', 422);

$stmtP = db()->prepare('SELECT id, status, cliente_id FROM propostas WHERE id = :id LIMIT 1');
$stmtP->execute([':id' => $propostaId]);
$p = $stmtP->fetch();
if (!$p) json_error('Proposta não encontrada', 404);
if ($p['status'] !== 'Aceita') {
    json_error('Apenas propostas Aceitas podem virar serviços', 409);
}

$criados = [];
$pulados = [];
$erros   = [];

db()->beginTransaction();
try {
    // Carrega todos os itens da proposta uma vez (validação)
    $stmtI = db()->prepare('SELECT * FROM proposta_itens WHERE proposta_id = :pid');
    $stmtI->execute([':pid' => $propostaId]);
    $byId = [];
    foreach ($stmtI->fetchAll() as $row) {
        $byId[(int) $row['id']] = $row;
    }

    $insSvc = db()->prepare(
        'INSERT INTO servicos
         (codigo, cliente_id, template, descricao, categoria_servico,
          franquia_horas, franquia_km,
          valor_fatura, diaria_paga,
          hora_extra_fatura, hora_extra_paga,
          km_extra_fatura, km_extra_pago,
          adicional_domingos_fatura, adicional_domingos_pago,
          aliquota, status)
         VALUES
         (:cod, :cid, :tpl, :desc, :cat,
          0, 0,
          :vf, 0,
          0, 0,
          0, 0,
          0, 0,
          :aliq, "ATIVO")'
    );

    $updItem = db()->prepare(
        'UPDATE proposta_itens SET servico_id = :svc, convertido_em = NOW() WHERE id = :id'
    );

    foreach ($itensReq as $req) {
        $itemId = (int) ($req['id'] ?? 0);
        if (!$itemId || !isset($byId[$itemId])) {
            $erros[] = ['item_id' => $itemId, 'erro' => 'Item não pertence à proposta'];
            continue;
        }
        $item = $byId[$itemId];
        if (!empty($item['servico_id'])) {
            $pulados[] = [
                'item_id'    => $itemId,
                'servico_id' => (int) $item['servico_id'],
                'motivo'     => 'já convertido',
            ];
            continue;
        }

        $codigo = trim((string) ($req['codigo'] ?? ''));
        $clienteId = (int) ($req['cliente_id'] ?? $p['cliente_id'] ?? 0);
        if ($codigo === '') {
            $erros[] = ['item_id' => $itemId, 'erro' => 'codigo obrigatório'];
            continue;
        }
        if (!$clienteId) {
            $erros[] = ['item_id' => $itemId, 'erro' => 'cliente_id obrigatório (proposta sem cliente_id)'];
            continue;
        }

        $template  = (string) ($req['template']          ?? $item['template']          ?? 'TOMBINI');
        $descricao = (string) ($req['descricao']         ?? $item['descricao']);
        $categoria = strtoupper((string) ($req['categoria_servico'] ?? $item['categoria_servico'] ?? 'FACILITIES'));
        $valor     = (float)  ($req['valor_fatura']      ?? $item['valor_unitario'] ?? 0);
        $aliquota  = (float)  ($req['aliquota']          ?? 0);

        try {
            $insSvc->execute([
                ':cod'  => $codigo,
                ':cid'  => $clienteId,
                ':tpl'  => $template,
                ':desc' => $descricao,
                ':cat'  => $categoria,
                ':vf'   => $valor,
                ':aliq' => $aliquota,
            ]);
            $svcId = (int) db()->lastInsertId();
            $updItem->execute([':svc' => $svcId, ':id' => $itemId]);
            $criados[] = ['item_id' => $itemId, 'servico_id' => $svcId, 'codigo' => $codigo];
        } catch (PDOException $e) {
            // Provavelmente codigo duplicado (uk_codigo)
            $msg = (str_contains($e->getMessage(), 'uk_codigo') || str_contains($e->getMessage(), 'Duplicate'))
                ? 'codigo já existe no catálogo'
                : 'erro ao criar servico: ' . $e->getMessage();
            $erros[] = ['item_id' => $itemId, 'erro' => $msg];
        }
    }

    db()->commit();
} catch (Throwable $e) {
    db()->rollBack();
    throw $e;
}

$status = $erros ? 207 : 200; // 207 Multi-Status quando há erros parciais
json_response([
    'proposta_id' => $propostaId,
    'criados'     => $criados,
    'pulados'     => $pulados,
    'erros'       => $erros,
], $status);
