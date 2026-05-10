<?php
/**
 * /api/parcelas/grupo.php?entidade=X&grupo_id=UUID — GET
 *
 * Retorna o parcelamento agregado:
 *   - resumo: valor_total, valor_pago, valor_pendente, parcelas_pagas, etc.
 *   - parcelas: lista detalhada (ordenada por parcela_atual)
 *
 * Útil para drill-down no frontend (modal "Ver parcelamento").
 */
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

$entidade = (string) ($_GET['entidade'] ?? '');
$grupoId  = trim((string) ($_GET['grupo_id'] ?? ''));

$meta = parcela_entidade_meta($entidade);
require_permission($meta['permissao']);

if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $grupoId)) {
    json_error('grupo_id inválido', 422);
}

$tabela = $meta['tabela'];
$resumo = parcela_grupo_resumo($tabela, $grupoId);

if ($resumo['parcelas_total'] === 0) {
    json_error('Grupo não encontrado', 404);
}

$stmt = db()->prepare(
    "SELECT * FROM {$tabela}
      WHERE grupo_parcela_id = :gid
   ORDER BY parcela_atual ASC, id ASC"
);
$stmt->execute([':gid' => $grupoId]);
$parcelas = $stmt->fetchAll();

json_response([
    'entidade'         => $entidade,
    'grupo_parcela_id' => $grupoId,
    'resumo'           => $resumo,
    'parcelas'         => $parcelas,
]);
