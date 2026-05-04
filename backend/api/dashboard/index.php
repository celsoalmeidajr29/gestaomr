<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_auth();

// Marcar faturas vencidas antes de agregar
db()->exec(
    "UPDATE fechamentos SET status_fatura='Vencida'
     WHERE data_vencimento < CURDATE() AND status_fatura NOT IN ('Paga','Vencida')"
);

$competencia = $_GET['competencia'] ?? date('Y-m');
$pdo = db();

$resumo = $pdo->prepare(
    "SELECT
       SUM(total_fatura) AS total_faturado,
       SUM(total_pago)   AS total_custo,
       SUM(total_imposto)AS total_imposto,
       SUM(lucro)        AS total_lucro,
       COUNT(*)          AS qtd_fechamentos,
       SUM(CASE WHEN status_fatura='Paga'    THEN total_fatura ELSE 0 END) AS total_recebido,
       SUM(CASE WHEN status_fatura='Vencida' THEN total_fatura ELSE 0 END) AS total_em_atraso,
       SUM(CASE WHEN status_fatura='Enviada' THEN total_fatura ELSE 0 END) AS total_enviado
     FROM fechamentos
     WHERE competencia = :comp"
);
$resumo->execute([':comp' => $competencia]);
$totais = $resumo->fetch();

$porCliente = $pdo->prepare(
    "SELECT c.nome AS cliente_nome, c.id AS cliente_id,
            SUM(f.total_fatura) AS faturado, SUM(f.lucro) AS lucro,
            COUNT(f.id) AS qtd, GROUP_CONCAT(DISTINCT f.status_fatura) AS status_lista
     FROM fechamentos f JOIN clientes c ON c.id=f.cliente_id
     WHERE f.competencia = :comp
     GROUP BY c.id ORDER BY faturado DESC"
);
$porCliente->execute([':comp' => $competencia]);

$lancamentosPendentes = (int) $pdo->query(
    "SELECT COUNT(*) FROM lancamentos WHERE status='pendente'"
)->fetchColumn();

$faturasPendentes = $pdo->query(
    "SELECT f.id, CONCAT('F-', LPAD(f.numero, 4, '0')) AS numero, c.nome AS cliente_nome,
            f.status_fatura, f.total_fatura, f.data_vencimento
     FROM fechamentos f JOIN clientes c ON c.id=f.cliente_id
     WHERE f.status_fatura IN ('Enviada','Aprovada','NF-emitida','Vencida')
     ORDER BY f.data_vencimento, f.numero"
)->fetchAll();

json_response([
    'competencia'         => $competencia,
    'totais'              => $totais,
    'por_cliente'         => $porCliente->fetchAll(),
    'lancamentos_pendentes' => $lancamentosPendentes,
    'faturas_abertas'     => $faturasPendentes,
]);
