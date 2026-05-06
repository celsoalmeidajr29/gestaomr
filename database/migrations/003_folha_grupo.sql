-- ============================================================================
-- Migração 003 — Campo folha_grupo em funcionarios (idempotente)
-- Vincula funcionários com salário fixo a um grupo de folha interna
-- (ex: ARMADA, ESCRITÓRIO) que aparece no Resumo separado da folha dos clientes.
-- ============================================================================
-- Requer MySQL 8.0+ (suporta IF NOT EXISTS em ALTER).
-- Seguro para rodar várias vezes.
-- ============================================================================

ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS `folha_grupo` VARCHAR(60) DEFAULT NULL AFTER `status`;
