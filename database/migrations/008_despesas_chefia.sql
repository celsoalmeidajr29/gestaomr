-- Migration 008: tabela despesas_chefia
-- Despesas de chefia (Manhães / Ricardo) — isoladas das despesas operacionais

CREATE TABLE IF NOT EXISTS `despesas_chefia` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `descricao`        VARCHAR(255) NOT NULL,
  `competencia`      CHAR(7) NOT NULL COMMENT 'AAAA-MM',
  `tipo`             ENUM('FIXA','PARCELA','AVULSA') NOT NULL DEFAULT 'AVULSA',
  `valor`            DECIMAL(12,2) NOT NULL,
  `origem`           ENUM('MANHÃES','RICARDO') NOT NULL DEFAULT 'MANHÃES',
  `data_lancamento`  DATE DEFAULT NULL,
  `data_pagamento`   DATE DEFAULT NULL,
  `parcela_atual`    SMALLINT UNSIGNED DEFAULT NULL,
  `parcela_total`    SMALLINT UNSIGNED DEFAULT NULL,
  `status`           ENUM('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente',
  `observacoes`      TEXT DEFAULT NULL,
  `criado_por`       INT UNSIGNED DEFAULT NULL,
  `criado_em`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_competencia` (`competencia`),
  KEY `idx_origem` (`origem`),
  CONSTRAINT `fk_despesas_chefia_usuario` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
