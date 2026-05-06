-- ============================================================================
-- Migração 006 — Campos faltantes na tabela lancamentos (idempotente)
-- Adiciona `os` (numero da OS) e `nome_feriado` + indice em os.
-- ============================================================================
-- Requer MySQL 8.0+ (suporta IF NOT EXISTS em ALTER).
-- Seguro para rodar várias vezes.
-- ============================================================================

ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS `os`           VARCHAR(20)  DEFAULT NULL AFTER `id`;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS `nome_feriado` VARCHAR(120) DEFAULT NULL AFTER `is_feriado`;

-- Índice em `os` (cria só se não existir)
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'lancamentos' AND index_name = 'idx_os');
SET @s := IF(@idx = 0, 'ALTER TABLE lancamentos ADD KEY `idx_os` (`os`)', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
