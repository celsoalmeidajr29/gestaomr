<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('servicos');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

function fetch_servico(int $id): array|false
{
    return db()->query(
        "SELECT s.*, c.nome AS cliente_nome
         FROM servicos s JOIN clientes c ON c.id = s.cliente_id
         WHERE s.id = {$id}"
    )->fetch();
}

if ($method === 'GET') {
    $row = fetch_servico($id);
    if (!$row) {
        json_error('Serviço não encontrado', 404);
    }
    json_response($row);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    foreach (['codigo', 'cliente_id', 'template', 'descricao', 'categoria_servico'] as $f) {
        if (empty($d[$f])) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    $stmt = db()->prepare(
        'UPDATE servicos SET codigo=:codigo, cliente_id=:cliente_id, template=:template,
         descricao=:descricao, categoria_servico=:categoria, cnpj_servico=:cnpj,
         emissao=:emissao, franquia_horas=:fhoras, franquia_km=:fkm,
         valor_fatura=:vfatura, diaria_paga=:diaria,
         hora_extra_fatura=:hef, hora_extra_paga=:hep,
         km_extra_fatura=:kef, km_extra_pago=:kep,
         adicional_domingos_fatura=:adf, adicional_domingos_pago=:adp,
         aliquota=:aliquota, status=:status
         WHERE id=:id'
    );
    $stmt->execute([
        ':codigo'    => $d['codigo'],
        ':cliente_id'=> (int) $d['cliente_id'],
        ':template'  => $d['template'],
        ':descricao' => $d['descricao'],
        ':categoria' => $d['categoria_servico'],
        ':cnpj'      => $d['cnpj_servico'] ?? null,
        ':emissao'   => $d['emissao'] ?? null,
        ':fhoras'    => $d['franquia_horas'] ?? 0,
        ':fkm'       => $d['franquia_km'] ?? 0,
        ':vfatura'   => $d['valor_fatura'] ?? 0,
        ':diaria'    => $d['diaria_paga'] ?? 0,
        ':hef'       => $d['hora_extra_fatura'] ?? 0,
        ':hep'       => $d['hora_extra_paga'] ?? 0,
        ':kef'       => $d['km_extra_fatura'] ?? 0,
        ':kep'       => $d['km_extra_pago'] ?? 0,
        ':adf'       => $d['adicional_domingos_fatura'] ?? 0,
        ':adp'       => $d['adicional_domingos_pago'] ?? 0,
        ':aliquota'  => $d['aliquota'] ?? 0,
        ':status'    => $d['status'] ?? 'ATIVO',
        ':id'        => $id,
    ]);
    json_response(fetch_servico($id));
}

if ($method === 'DELETE') {
    $stmt = db()->prepare("UPDATE servicos SET status='INATIVO' WHERE id=:id");
    $stmt->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'INATIVO']);
}

json_error('Método não permitido', 405);
