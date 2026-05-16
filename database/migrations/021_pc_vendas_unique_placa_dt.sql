-- Migration 021: pc_vendas — chave única por (placa, dt_registro)
-- Antes: UNIQUE em placa (016) ou em hash_dedup SHA1(dt|placa|valor) (019)
-- Depois: UNIQUE em (placa, dt_registro) — mesma placa na mesma data/hora = mesma transação
--         Re-importar o mesmo CSV atualiza os campos (preço, emissor, trecho) em vez de duplicar.
--
-- Execute no phpMyAdmin. Se algum DROP INDEX falhar com "check that key exists",
-- ignore o erro e continue com o próximo bloco.
-- ============================================================================

-- 1. Remove duplicatas por (placa, dt_registro): mantém o registro com maior id
DELETE v1 FROM pc_vendas v1
INNER JOIN pc_vendas v2
  ON  v1.placa        = v2.placa
  AND v1.dt_registro  = v2.dt_registro
  AND v1.id < v2.id;

-- 2. Remove índice antigo por placa (migration 016) — ignorar se não existir
ALTER TABLE pc_vendas DROP INDEX uq_placa;

-- 3. Remove índice por hash (migration 019) — ignorar se não existir
ALTER TABLE pc_vendas DROP INDEX uq_hash_dedup;

-- 4. Garante colunas de rastreabilidade (idempotente no MySQL 8+)
ALTER TABLE pc_vendas
  ADD COLUMN IF NOT EXISTS nome_arquivo VARCHAR(255) NULL COMMENT 'Nome do CSV de origem',
  ADD COLUMN IF NOT EXISTS importado_em DATETIME NULL     COMMENT 'Timestamp da 1a importacao';

-- 5. Adiciona chave composta (placa, dt_registro)
--    NULL em dt_registro não participa da unicidade (MySQL permite múltiplos NULLs)
ALTER TABLE pc_vendas
  ADD UNIQUE KEY uq_placa_dt (placa, dt_registro);
