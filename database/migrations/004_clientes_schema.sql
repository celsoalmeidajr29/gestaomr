-- ============================================================================
-- Migração 004 — Campos faltantes na tabela clientes
-- Adiciona aliquota, razao_social, bairro, numero, complemento, cargo_contato
-- e atualiza os 5 clientes iniciais com dados completos.
-- ============================================================================

-- Renomear nome_fantasia → razao_social (mais claro e alinhado com o frontend)
ALTER TABLE clientes CHANGE COLUMN `nome_fantasia` `razao_social` VARCHAR(150) DEFAULT NULL;

-- Campos adicionais ausentes
ALTER TABLE clientes
  ADD COLUMN `aliquota`      DECIMAL(5,2)  NOT NULL DEFAULT 0.00 AFTER `inscricao_estadual`,
  ADD COLUMN `numero`        VARCHAR(20)   DEFAULT NULL AFTER `endereco`,
  ADD COLUMN `complemento`   VARCHAR(80)   DEFAULT NULL AFTER `numero`,
  ADD COLUMN `bairro`        VARCHAR(100)  DEFAULT NULL AFTER `complemento`,
  ADD COLUMN `cargo_contato` VARCHAR(80)   DEFAULT NULL AFTER `contato_nome`;

-- Atualizar os 5 clientes iniciais com alíquota correta
UPDATE clientes SET
  razao_social = 'NATURA COSMÉTICOS S.A',
  aliquota     = 15.60,
  cidade       = 'Cajamar',
  uf           = 'SP'
WHERE nome = 'NATURA COSMÉTICOS S.A';

UPDATE clientes SET aliquota = 8.65  WHERE nome = 'IRB LOGÍSTICA ITRACKER';
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'GRUPO TOMBINI';
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'ESCOLTECH';
UPDATE clientes SET aliquota = 15.60 WHERE nome = 'BRK TECNOLOGIA';
