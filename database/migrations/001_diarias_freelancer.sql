-- ============================================================================
-- Migration 001 — Diárias de Freelancer
-- Data: 2026-05-04
-- Descrição: Lançamentos avulsos de funcionários cadastrados em serviços
--            fora do catálogo regular. Integra folha (diárias avulsas)
--            e custo por cliente na competência.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `diarias_freelancer` (
  `id`            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `competencia`   CHAR(7)        NOT NULL COMMENT 'AAAA-MM derivado da data',
  `data`          DATE           NOT NULL,
  `funcionario_id` INT UNSIGNED  NOT NULL,
  `nome_snapshot` VARCHAR(150)   NOT NULL COMMENT 'Snapshot do nome no momento do lançamento',
  `cliente_id`    INT UNSIGNED   DEFAULT NULL,
  `cliente_nome`  VARCHAR(150)   NOT NULL COMMENT 'Snapshot do nome do cliente',
  `valor`         DECIMAL(10,2)  NOT NULL,
  `observacoes`   TEXT           DEFAULT NULL,
  `criado_por`    INT UNSIGNED   DEFAULT NULL,
  `criado_em`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_competencia`   (`competencia`),
  KEY `idx_funcionario`   (`funcionario_id`),
  KEY `idx_cliente`       (`cliente_id`),
  KEY `idx_data`          (`data`),
  CONSTRAINT `fk_df_func`   FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`),
  CONSTRAINT `fk_df_cliente` FOREIGN KEY (`cliente_id`)    REFERENCES `clientes`     (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_df_user`   FOREIGN KEY (`criado_por`)     REFERENCES `usuarios`     (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
