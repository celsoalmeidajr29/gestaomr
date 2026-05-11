<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';

require_permission('pareceto');
$method = $_SERVER['REQUEST_METHOD'];
$user   = current_user();

if ($method === 'GET') {
    $where  = [];
    $params = [];
    if (!empty($_GET['modulo'])) {
        $where[] = 'modulo = :modulo';
        $params[':modulo'] = $_GET['modulo'];
    }
    $wc   = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = db()->prepare(
        "SELECT id, modulo, periodo_inicio, periodo_fim, total_registros, nome_arquivo, created_at
         FROM pc_relatorios_historico {$wc}
         ORDER BY created_at DESC
         LIMIT 100"
    );
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $d = json_input();
    foreach (['modulo', 'periodo_inicio', 'periodo_fim', 'resumo_json'] as $f) {
        if (empty($d[$f])) json_error("Campo obrigatório: {$f}", 422);
    }
    $modulos = ['vendas', 'irregularidades'];
    if (!in_array($d['modulo'], $modulos, true)) json_error('Módulo inválido', 422);

    $stmt = db()->prepare(
        'INSERT INTO pc_relatorios_historico
         (modulo, periodo_inicio, periodo_fim, total_registros, resumo_json, nome_arquivo, created_by)
         VALUES (:mod, :pi, :pf, :tr, :rj, :nf, :uid)'
    );
    $stmt->execute([
        ':mod' => $d['modulo'],
        ':pi'  => $d['periodo_inicio'],
        ':pf'  => $d['periodo_fim'],
        ':tr'  => (int) ($d['total_registros'] ?? 0),
        ':rj'  => is_string($d['resumo_json']) ? $d['resumo_json'] : json_encode($d['resumo_json']),
        ':nf'  => $d['nome_arquivo'] ?? null,
        ':uid' => $user['id'],
    ]);
    json_response(['id' => (int) db()->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) json_error('ID inválido', 400);
    db()->prepare('DELETE FROM pc_relatorios_historico WHERE id=:id')->execute([':id' => $id]);
    json_response(['id' => $id, 'deleted' => true]);
}

json_error('Método não permitido', 405);
