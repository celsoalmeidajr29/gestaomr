<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('lancamentos');
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $where = [];
    $params = [];
    if (!empty($_GET['competencia'])) {
        $where[] = 'd.competencia = :comp';
        $params[':comp'] = $_GET['competencia'];
    }
    if (!empty($_GET['funcionario_id'])) {
        $where[] = 'd.funcionario_id = :fid';
        $params[':fid'] = (int) $_GET['funcionario_id'];
    }
    if (!empty($_GET['cliente_id'])) {
        $where[] = 'd.cliente_id = :cid';
        $params[':cid'] = (int) $_GET['cliente_id'];
    }
    $wc  = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $sql = "SELECT d.*, f.nome AS funcionario_nome, c.nome AS cliente_nome_atual
            FROM diarias_freelancer d
            JOIN funcionarios f ON f.id = d.funcionario_id
            LEFT JOIN clientes c ON c.id = d.cliente_id
            {$wc}
            ORDER BY d.data DESC, d.id DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

// ── POST — criação única ou importação em lote ────────────────────────────────
if ($method === 'POST') {
    $body = json_input();
    $user = current_user();
    $pdo  = db();

    // Lote: array direto
    $itens = isset($body[0]) ? $body : [$body];

    $inseridos = 0;
    $erros     = [];
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO diarias_freelancer
             (competencia, data, funcionario_id, nome_snapshot, cliente_id, cliente_nome, valor, observacoes, criado_por)
             VALUES (:comp, :data, :fid, :nome, :cid, :cnome, :valor, :obs, :uid)'
        );
        foreach ($itens as $idx => $d) {
            if (empty($d['funcionario_id']) || empty($d['data']) || empty($d['valor'])) {
                $erros[] = "Item {$idx}: campos obrigatórios ausentes (funcionario_id, data, valor)";
                continue;
            }
            // Deriva competência da data se não vier explícita
            $comp = $d['competencia'] ?? substr((string) $d['data'], 0, 7);
            $stmt->execute([
                ':comp'  => $comp,
                ':data'  => $d['data'],
                ':fid'   => (int) $d['funcionario_id'],
                ':nome'  => $d['nome_snapshot'] ?? '',
                ':cid'   => isset($d['cliente_id']) ? (int) $d['cliente_id'] : null,
                ':cnome' => $d['cliente_nome'] ?? '',
                ':valor' => (float) $d['valor'],
                ':obs'   => $d['observacoes'] ?? null,
                ':uid'   => $user['id'],
            ]);
            $inseridos++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    json_response(['inseridos' => $inseridos, 'erros' => $erros], $erros ? 207 : 201);
}

json_error('Método não permitido', 405);
