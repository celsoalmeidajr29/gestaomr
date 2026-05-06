-- ============================================================================
-- Migração 004 — Campos faltantes na tabela clientes (idempotente, simples)
-- Adiciona: razao_social, aliquota, numero, complemento, bairro, cargo_contato
-- Remove:   nome_fantasia (legado)
-- Atualiza alíquotas dos 5 clientes iniciais.
-- ============================================================================
-- Requer MySQL 8.0.20+ (suporta ADD COLUMN IF NOT EXISTS e DROP COLUMN IF EXISTS).
-- Hostinger usa MySQL 8.0+.
--
-- SEGURO PARA RODAR VÁRIAS VEZES — todas as operações são idempotentes.
-- Cole no phpMyAdmin → aba SQL → Executar.
-- ============================================================================

-- 1) Adicionar colunas novas (não falha se já existirem)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS `razao_social`  VARCHAR(150) DEFAULT NULL                    AFTER `nome`;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS `aliquota`      DECIMAL(5,2) NOT NULL DEFAULT 0.00           AFTER `inscricao_estadual`;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS `numero`        VARCHAR(20)  DEFAULT NULL                    AFTER `endereco`;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS `complemento`   VARCHAR(80)  DEFAULT NULL                    AFTER `numero`;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS `bairro`        VARCHAR(100) DEFAULT NULL                    AFTER `complemento`;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS `cargo_contato` VARCHAR(80)  DEFAULT NULL                    AFTER `contato_nome`;

-- 2) Remover coluna legada nome_fantasia (não falha se já não existir)
ALTER TABLE clientes DROP COLUMN IF EXISTS `nome_fantasia`;

-- 3) Atualizar alíquotas dos clientes iniciais — só preenche se ainda estiver 0
UPDATE clientes SET aliquota = 15.60 WHERE nome = 'NATURA COSMÉTICOS S.A' AND aliquota = 0;
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'IRB LOGÍSTICA ITRACKER' AND aliquota = 0;
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'GRUPO TOMBINI'          AND aliquota = 0;
UPDATE clientes SET aliquota = 8.65  WHERE nome = 'ESCOLTECH'              AND aliquota = 0;
UPDATE clientes SET aliquota = 15.60 WHERE nome = 'BRK TECNOLOGIA'         AND aliquota = 0;

-- 4) Preencher razao_social e cidade/uf da NATURA — só se ainda vazios
UPDATE clientes
   SET razao_social = COALESCE(NULLIF(razao_social, ''), 'NATURA COSMÉTICOS S.A'),
       cidade       = COALESCE(NULLIF(cidade, ''),      'Cajamar'),
       uf           = COALESCE(NULLIF(uf, ''),          'SP')
 WHERE nome = 'NATURA COSMÉTICOS S.A';
