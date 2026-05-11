-- Migration 019: pc_vendas — dedup por hash em vez de placa
-- Antes: UNIQUE em placa (guardava apenas 1 registro por placa)
-- Depois: UNIQUE em hash_dedup = SHA1(dt_registro|placa|valor)
--         Garante que a mesma transacao nao entra 2x, mas a mesma
--         placa pode ter N transacoes (N sessoes de estacionamento).
--
-- Tambem adiciona nome_arquivo e importado_em para rastreabilidade.
-- Idempotente para ADD COLUMN IF NOT EXISTS (MySQL 8.0+).
-- Rode UMA VEZ no phpMyAdmin antes de importar novos dados.
-- ============================================================================

-- 1. Adiciona colunas novas (seguro rodar mais de uma vez)
ALTER TABLE pc_vendas
  ADD COLUMN IF NOT EXISTS hash_dedup   CHAR(40) NULL    COMMENT 'SHA1(dt_registro|placa|valor) — chave de dedup',
  ADD COLUMN IF NOT EXISTS nome_arquivo VARCHAR(255) NULL COMMENT 'Nome do CSV de origem',
  ADD COLUMN IF NOT EXISTS importado_em DATETIME NULL     COMMENT 'Timestamp da importacao';

-- 2. Backfill: calcula hash para registros existentes
UPDATE pc_vendas
   SET hash_dedup = SHA1(CONCAT(
         COALESCE(CAST(dt_registro AS CHAR(19)), ''), '|',
         COALESCE(placa, ''), '|',
         COALESCE(CAST(valor AS CHAR), '')
       ))
 WHERE hash_dedup IS NULL;

-- 3. Remove UNIQUE antigo em placa (placa passa a ser coluna simples)
ALTER TABLE pc_vendas DROP INDEX uq_placa;

-- 4. Adiciona UNIQUE em hash_dedup
ALTER TABLE pc_vendas
  ADD UNIQUE KEY uq_hash_dedup (hash_dedup);
