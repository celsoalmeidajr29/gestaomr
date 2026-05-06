-- ============================================================================
-- Migração 004 — Campos faltantes na tabela clientes (idempotente)
-- Renomeia nome_fantasia → razao_social, adiciona aliquota, numero, complemento,
-- bairro e cargo_contato. Atualiza alíquotas dos 5 clientes iniciais.
-- ============================================================================
-- Esta versão é segura para rodar várias vezes: cada ALTER verifica antes
-- se a coluna ainda precisa ser aplicada.
-- ============================================================================

-- 1. Renomear nome_fantasia → razao_social (só se nome_fantasia ainda existir)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'nome_fantasia'
);
SET @sql := IF(@col_exists > 0,
  'ALTER TABLE clientes CHANGE COLUMN `nome_fantasia` `razao_social` VARCHAR(150) DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. Caso o banco tenha sido criado já sem nome_fantasia mas também sem razao_social,
-- garante a coluna razao_social.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'razao_social'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE clientes ADD COLUMN `razao_social` VARCHAR(150) DEFAULT NULL AFTER `nome`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. aliquota
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'aliquota'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE clientes ADD COLUMN `aliquota` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `inscricao_estadual`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. numero
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'numero'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE clientes ADD COLUMN `numero` VARCHAR(20) DEFAULT NULL AFTER `endereco`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. complemento
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'complemento'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE clientes ADD COLUMN `complemento` VARCHAR(80) DEFAULT NULL AFTER `numero`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. bairro
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'bairro'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE clientes ADD COLUMN `bairro` VARCHAR(100) DEFAULT NULL AFTER `complemento`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. cargo_contato
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'cargo_contato'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE clientes ADD COLUMN `cargo_contato` VARCHAR(80) DEFAULT NULL AFTER `contato_nome`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Atualizar os 5 clientes iniciais com alíquota correta (idempotente — UPDATE é seguro)
UPDATE clientes SET
  razao_social = COALESCE(NULLIF(razao_social, ''), 'NATURA COSMÉTICOS S.A'),
  aliquota     = 15.60,
  cidade       = COALESCE(NULLIF(cidade, ''), 'Cajamar'),
  uf           = COALESCE(NULLIF(uf, ''), 'SP')
WHERE nome = 'NATURA COSMÉTICOS S.A';

UPDATE clientes SET aliquota = 8.65  WHERE nome = 'IRB LOGÍSTICA ITRACKER' AND aliquota = 0;
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'GRUPO TOMBINI'         AND aliquota = 0;
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'ESCOLTECH'             AND aliquota = 0;
UPDATE clientes SET aliquota = 15.60 WHERE nome = 'BRK TECNOLOGIA'        AND aliquota = 0;
