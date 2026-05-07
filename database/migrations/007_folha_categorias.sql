-- ============================================================================
-- Migração 007 — Categorias de Folha (catálogo) + competência/categoria em lançamentos
-- ============================================================================
-- Cria a tabela folha_categorias (catálogo gerenciável pela aba "Cat. Folha"
-- do frontend) e adiciona em lançamentos os campos `competencia` (override)
-- e `categoria_folha` (string), que controlam o agrupamento da folha de pagamento
-- independentemente da data do lançamento.
--
-- Regras:
--  - Lançamentos com mesma `competencia` (ou mesmo data.YYYY-MM se vazia) e
--    mesma `categoria_folha` se consolidam numa única folha.
--  - `categoria_folha` é uma string livre com lookup no catálogo folha_categorias.
--  - `competencia` formato AAAA-MM (CHAR(7)).
--
-- Idempotente: roda várias vezes sem erro (MySQL 8.0+).
-- ============================================================================

-- 1) Tabela de catálogo de categorias de folha
CREATE TABLE IF NOT EXISTS `folha_categorias` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(60) NOT NULL,
  `cor` VARCHAR(20) DEFAULT NULL COMMENT 'Cor sugerida (azul/verde/amarelo etc) — opcional',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Colunas em lancamentos (idempotente — não falha se já existirem)
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS `competencia`     CHAR(7)     DEFAULT NULL AFTER `data`;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS `categoria_folha` VARCHAR(60) DEFAULT NULL AFTER `competencia`;

-- 2b) Coluna em diarias_freelancer
ALTER TABLE diarias_freelancer ADD COLUMN IF NOT EXISTS `folha_grupo` VARCHAR(60) DEFAULT NULL AFTER `cliente_nome`;

-- 3) Índices auxiliares (cria só se não existir)
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'lancamentos' AND index_name = 'idx_competencia');
SET @s := IF(@idx = 0, 'ALTER TABLE lancamentos ADD KEY `idx_competencia` (`competencia`)', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'lancamentos' AND index_name = 'idx_categoria_folha');
SET @s := IF(@idx = 0, 'ALTER TABLE lancamentos ADD KEY `idx_categoria_folha` (`categoria_folha`)', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
