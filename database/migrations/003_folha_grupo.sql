-- ============================================================================
-- Migração 003 — Campo folha_grupo em funcionarios
-- Vincula funcionários com salário fixo a um grupo de folha interna
-- (ex: ARMADA, ESCRITÓRIO) que aparece no Resumo separado da folha dos clientes.
-- ============================================================================

ALTER TABLE funcionarios
  ADD COLUMN folha_grupo VARCHAR(60) NULL DEFAULT NULL AFTER status;
