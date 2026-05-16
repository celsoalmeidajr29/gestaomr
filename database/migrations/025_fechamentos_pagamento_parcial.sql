-- Migration 025 — Pagamento parcial de faturas (clientes que não pagam tudo de uma vez)
-- Executar no phpMyAdmin antes de usar o registro de pagamentos parciais.
--
-- valor_recebido        = soma acumulada do que o cliente já pagou (parcial ou total)
-- pagamentos_recebidos  = histórico JSON [{ data:'YYYY-MM-DD', valor:1234.56, obs:'...' }]
--
-- valor_pendente é derivado em runtime (total_fatura - valor_recebido), não armazenado,
-- para evitar drift se o total da fatura for editado.

ALTER TABLE fechamentos
  ADD COLUMN IF NOT EXISTS valor_recebido       DECIMAL(12,2) NOT NULL DEFAULT 0
    COMMENT 'Soma acumulada paga pelo cliente' AFTER total_pago,
  ADD COLUMN IF NOT EXISTS pagamentos_recebidos JSON NULL
    COMMENT 'Histórico de pagamentos parciais [{data,valor,obs}]' AFTER valor_recebido;
