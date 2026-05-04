<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('servicos');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $params = [];
    $where = [];
    if (!empty($_GET['cliente_id'])) {
        $where[] = 's.cliente_id = :cliente_id';
        $params[':cliente_id'] = (int) $_GET['cliente_id'];
    }
    // Por padrão retorna apenas ativos; passe ?status=INATIVO ou ?status=todos para ver outros
    if (!empty($_GET['status']) && $_GET['status'] !== 'todos') {
        $where[] = 's.status = :status';
        $params[':status'] = $_GET['status'];
    } elseif (empty($_GET['status'])) {
        $where[] = "s.status = 'ATIVO'";
    }
    if (!empty($_GET['template'])) {
        $where[] = 's.template = :template';
        $params[':template'] = $_GET['template'];
    }
    $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $sql = "SELECT s.*, c.nome AS cliente_nome FROM servicos s
            JOIN clientes c ON c.id = s.cliente_id
            {$whereClause}
            ORDER BY s.cliente_id, s.codigo";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['codigo', 'cliente_id', 'template', 'descricao', 'categoria_servico'] as $f) {
        if (empty($d[$f])) {
            json_error("Campo obrigatório: {$f}", 422);
        }
    }
    $stmt = db()->prepare(
        'INSERT INTO servicos (codigo, cliente_id, template, descricao, categoria_servico,
         cnpj_servico, emissao, franquia_horas, franquia_km, valor_fatura, diaria_paga,
         hora_extra_fatura, hora_extra_paga, km_extra_fatura, km_extra_pago,
         adicional_domingos_fatura, adicional_domingos_pago, aliquota, status)
         VALUES (:codigo, :cliente_id, :template, :descricao, :categoria,
         :cnpj, :emissao, :fhoras, :fkm, :vfatura, :diaria,
         :hef, :hep, :kef, :kep, :adf, :adp, :aliquota, :status)'
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
    ]);
    $id = (int) db()->lastInsertId();
    $row = db()->query("SELECT s.*, c.nome AS cliente_nome FROM servicos s JOIN clientes c ON c.id=s.cliente_id WHERE s.id={$id}")->fetch();
    json_response($row, 201);
}

json_error('Método não permitido', 405);
