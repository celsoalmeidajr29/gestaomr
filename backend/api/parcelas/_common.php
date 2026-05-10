<?php
/**
 * Helpers compartilhados pelos endpoints de parcelas.
 * Mapeia metadata por entidade (despesas | despesas_chefia | descontos)
 * para evitar repetição de SQL/regras nas 3 rotas (criar, grupo, migrar).
 */
declare(strict_types=1);

if (!function_exists('parcela_uuid_v4')) {
    function parcela_uuid_v4(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
}

if (!function_exists('parcela_entidade_meta')) {
    /**
     * Retorna metadata da tabela alvo. Lança json_error se inválida.
     *
     * Campos retornados:
     *   tabela          → nome da tabela
     *   permissao       → recurso para require_permission()
     *   col_competencia → nome da coluna de competência (sempre 'competencia' hoje)
     *   col_data        → nome da coluna de data principal (data_lancamento | data)
     *   col_alvo        → coluna usada para agrupar parcelas (origem | alvo_nome)
     *   tipo_parcela    → valor que indica que o registro é parcela ('PARCELA' em todas)
     *   campos_extra    → lista de campos opcionais aceitos no payload
     */
    function parcela_entidade_meta(string $entidade): array
    {
        switch ($entidade) {
            case 'despesas':
                return [
                    'tabela'          => 'despesas',
                    'permissao'       => 'despesas',
                    'col_competencia' => 'competencia',
                    'col_data'        => 'data_lancamento',
                    'col_alvo'        => 'origem',
                    'tipo_parcela'    => 'PARCELA',
                    'campos_extra'    => ['centro_custo', 'origem', 'observacoes'],
                ];
            case 'despesas_chefia':
                return [
                    'tabela'          => 'despesas_chefia',
                    'permissao'       => 'despesas',
                    'col_competencia' => 'competencia',
                    'col_data'        => 'data_lancamento',
                    'col_alvo'        => 'origem',
                    'tipo_parcela'    => 'PARCELA',
                    'campos_extra'    => ['origem', 'observacoes'],
                ];
            case 'descontos':
                return [
                    'tabela'          => 'descontos',
                    'permissao'       => 'descontos',
                    'col_competencia' => 'competencia',
                    'col_data'        => 'data',
                    'col_alvo'        => 'alvo_nome',
                    'tipo_parcela'    => 'PARCELA',
                    'campos_extra'    => ['tipo_vale', 'centro_custo', 'forma_pagamento', 'observacoes', 'funcionario_id'],
                ];
        }
        json_error("Entidade inválida ('despesas' | 'despesas_chefia' | 'descontos')", 422);
    }
}

if (!function_exists('parcela_competencia_proxima')) {
    /**
     * Retorna a competência (AAAA-MM) que vem N meses depois da $competencia.
     */
    function parcela_competencia_proxima(string $competencia, int $offset): string
    {
        if (!preg_match('/^(\d{4})-(\d{2})$/', $competencia, $m)) {
            json_error('Competência inválida (formato AAAA-MM)', 422);
        }
        $ano = (int) $m[1];
        $mes = (int) $m[2];
        $mes += $offset;
        while ($mes > 12) { $mes -= 12; $ano++; }
        while ($mes < 1)  { $mes += 12; $ano--; }
        return sprintf('%04d-%02d', $ano, $mes);
    }
}

if (!function_exists('parcela_data_proxima')) {
    /**
     * Avança a data N meses, mantendo o dia (clampa pro último dia do mês quando o
     * mês destino tem menos dias — ex: 31/jan + 1 mês = 28/fev ou 29/fev).
     * Aceita string YYYY-MM-DD ou null (nesse caso retorna null).
     */
    function parcela_data_proxima(?string $data, int $offset): ?string
    {
        if (!$data) return null;
        $ts = strtotime($data);
        if ($ts === false) return null;
        $dia = (int) date('d', $ts);
        $ano = (int) date('Y', $ts);
        $mes = (int) date('m', $ts);
        $mes += $offset;
        while ($mes > 12) { $mes -= 12; $ano++; }
        while ($mes < 1)  { $mes += 12; $ano--; }
        $ultimoDia = (int) date('t', mktime(0, 0, 0, $mes, 1, $ano));
        $diaFinal = min($dia, $ultimoDia);
        return sprintf('%04d-%02d-%02d', $ano, $mes, $diaFinal);
    }
}

if (!function_exists('parcela_grupo_resumo')) {
    /**
     * Calcula totais de um grupo de parcelas (uma única linha agregada).
     * Retorna: ['valor_total','valor_pago','valor_pendente','parcelas_total','parcelas_pagas','parcelas_pendentes','parcelas_canceladas'].
     */
    function parcela_grupo_resumo(string $tabela, string $grupoId): array
    {
        $sql = "SELECT
                    COUNT(*)                                         AS qtd_total,
                    SUM(CASE WHEN status='pago'       THEN 1 ELSE 0 END) AS qtd_pagas,
                    SUM(CASE WHEN status='pendente'   THEN 1 ELSE 0 END) AS qtd_pendentes,
                    SUM(CASE WHEN status='cancelado'  THEN 1 ELSE 0 END) AS qtd_canceladas,
                    COALESCE(SUM(valor), 0)                                                  AS valor_total,
                    COALESCE(SUM(CASE WHEN status='pago'      THEN valor ELSE 0 END), 0)     AS valor_pago,
                    COALESCE(SUM(CASE WHEN status='pendente'  THEN valor ELSE 0 END), 0)     AS valor_pendente,
                    COALESCE(SUM(CASE WHEN status='cancelado' THEN valor ELSE 0 END), 0)     AS valor_cancelado
                  FROM {$tabela}
                 WHERE grupo_parcela_id = :gid";
        $stmt = db()->prepare($sql);
        $stmt->execute([':gid' => $grupoId]);
        $row = $stmt->fetch() ?: [];
        return [
            'parcelas_total'      => (int) ($row['qtd_total'] ?? 0),
            'parcelas_pagas'      => (int) ($row['qtd_pagas'] ?? 0),
            'parcelas_pendentes'  => (int) ($row['qtd_pendentes'] ?? 0),
            'parcelas_canceladas' => (int) ($row['qtd_canceladas'] ?? 0),
            'valor_total'         => round((float) ($row['valor_total'] ?? 0), 2),
            'valor_pago'          => round((float) ($row['valor_pago'] ?? 0), 2),
            'valor_pendente'      => round((float) ($row['valor_pendente'] ?? 0), 2),
            'valor_cancelado'     => round((float) ($row['valor_cancelado'] ?? 0), 2),
        ];
    }
}
