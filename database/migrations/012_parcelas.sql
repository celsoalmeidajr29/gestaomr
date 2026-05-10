-- ============================================================================
-- Migration 012 — Parcelamentos (despesas + despesas_chefia + descontos/vales)
-- ============================================================================
-- Liga as N parcelas do mesmo parcelamento via `grupo_parcela_id` (UUID v4).
-- Os totais (valor_total/valor_pago/valor_pendente/parcelas_pagas) NÃO são
-- armazenados — calculados em runtime via SUM/COUNT por grupo (sempre exatos,
-- zero risco de drift se uma parcela for editada/cancelada).
--
-- Em descontos, o conceito de parcela ainda não existia. Esta migration
-- adiciona os campos `tipo`, `parcela_atual`, `parcela_total`, `status` e
-- `grupo_parcela_id` espelhando o padrão de despesas.
--
-- Idempotente — pode rodar várias vezes (MySQL 8.0+).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) despesas — só falta o link entre parcelas
-- ----------------------------------------------------------------------------
ALTER TABLE `despesas`
  ADD COLUMN IF NOT EXISTS `grupo_parcela_id` CHAR(36) DEFAULT NULL
    COMMENT 'UUID v4 que liga as N parcelas do mesmo parcelamento'
    AFTER `parcela_total`;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE()
                AND table_name = 'despesas'
                AND index_name = 'idx_grupo_parcela');
SET @s := IF(@idx = 0,
  'ALTER TABLE despesas ADD KEY `idx_grupo_parcela` (`grupo_parcela_id`)',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 2) despesas_chefia — só falta o link entre parcelas
-- ----------------------------------------------------------------------------
ALTER TABLE `despesas_chefia`
  ADD COLUMN IF NOT EXISTS `grupo_parcela_id` CHAR(36) DEFAULT NULL
    COMMENT 'UUID v4 que liga as N parcelas do mesmo parcelamento'
    AFTER `parcela_total`;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE()
                AND table_name = 'despesas_chefia'
                AND index_name = 'idx_grupo_parcela');
SET @s := IF(@idx = 0,
  'ALTER TABLE despesas_chefia ADD KEY `idx_grupo_parcela` (`grupo_parcela_id`)',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3) descontos (vales) — ganha o conceito completo de parcela
-- ----------------------------------------------------------------------------
ALTER TABLE `descontos`
  ADD COLUMN IF NOT EXISTS `tipo` ENUM('AVULSO','PARCELA') NOT NULL DEFAULT 'AVULSO'
    COMMENT 'AVULSO = vale único; PARCELA = vale parcelado em N x'
    AFTER `tipo_vale`;

ALTER TABLE `descontos`
  ADD COLUMN IF NOT EXISTS `parcela_atual` SMALLINT UNSIGNED DEFAULT NULL
    AFTER `tipo`;

ALTER TABLE `descontos`
  ADD COLUMN IF NOT EXISTS `parcela_total` SMALLINT UNSIGNED DEFAULT NULL
    AFTER `parcela_atual`;

ALTER TABLE `descontos`
  ADD COLUMN IF NOT EXISTS `status` ENUM('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente'
    AFTER `parcela_total`;

ALTER TABLE `descontos`
  ADD COLUMN IF NOT EXISTS `grupo_parcela_id` CHAR(36) DEFAULT NULL
    COMMENT 'UUID v4 que liga as N parcelas do mesmo parcelamento'
    AFTER `status`;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE()
                AND table_name = 'descontos'
                AND index_name = 'idx_grupo_parcela');
SET @s := IF(@idx = 0,
  'ALTER TABLE descontos ADD KEY `idx_grupo_parcela` (`grupo_parcela_id`)',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE()
                AND table_name = 'descontos'
                AND index_name = 'idx_status');
SET @s := IF(@idx = 0,
  'ALTER TABLE descontos ADD KEY `idx_status` (`status`)',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
