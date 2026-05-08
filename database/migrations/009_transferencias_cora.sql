-- Migration 009: tabelas de integração Cora (transferências PIX + log de webhooks)
-- Cada folha pendente que for transferida gera UMA linha em transferencias_cora.
-- Webhooks recebidos do Cora (confirmação/cancelamento) são auditados em cora_webhook_logs.

CREATE TABLE IF NOT EXISTS `transferencias_cora` (
  `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `folha_id`             INT UNSIGNED DEFAULT NULL COMMENT 'ID em folhas (pode ser NULL se a folha for computada e ainda não persistida)',
  `funcionario_id`       INT UNSIGNED DEFAULT NULL,
  `funcionario_nome`     VARCHAR(150) NOT NULL,
  `competencia`          CHAR(7) NOT NULL COMMENT 'AAAA-MM',
  `empresa`              ENUM('MR_ASSESSORIA','UP_VIGILANCIA') NOT NULL,
  `valor_liquido`        DECIMAL(12,2) NOT NULL,
  `chave_pix`            VARCHAR(255) NOT NULL,
  `tipo_pix`             VARCHAR(20) DEFAULT NULL COMMENT 'CPF, CNPJ, EMAIL, TELEFONE, ALEATORIA',
  `idempotency_key`      VARCHAR(80) NOT NULL COMMENT 'Chave única usada no header Idempotency-Key da Cora',
  `cora_transfer_id`     VARCHAR(100) DEFAULT NULL COMMENT 'ID retornado pela API Cora',
  `status`               ENUM('enviada','aguardando_aprovacao','concluida','rejeitada','erro','cancelada') NOT NULL DEFAULT 'enviada',
  `request_payload`      JSON DEFAULT NULL,
  `response_payload`     JSON DEFAULT NULL,
  `erro_mensagem`        TEXT DEFAULT NULL,
  `criado_por`           INT UNSIGNED DEFAULT NULL,
  `criado_em`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_idempotency_key` (`idempotency_key`),
  KEY `idx_folha`        (`folha_id`),
  KEY `idx_funcionario`  (`funcionario_id`),
  KEY `idx_status`       (`status`),
  KEY `idx_cora_transfer`(`cora_transfer_id`),
  KEY `idx_competencia`  (`competencia`),
  CONSTRAINT `fk_transferencia_cora_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transferencia_cora_usuario`     FOREIGN KEY (`criado_por`)     REFERENCES `usuarios`     (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log auditável de TODOS os webhooks recebidos do Cora (mesmo inválidos)
-- Crítico para debug e prova de recebimento em caso de divergência
CREATE TABLE IF NOT EXISTS `cora_webhook_logs` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento`            VARCHAR(80) DEFAULT NULL COMMENT 'tipo do evento: payment.confirmed, transfer.failed, etc',
  `empresa`           ENUM('MR_ASSESSORIA','UP_VIGILANCIA') DEFAULT NULL,
  `cora_transfer_id`  VARCHAR(100) DEFAULT NULL,
  `payload`           JSON NOT NULL,
  `signature_header`  VARCHAR(255) DEFAULT NULL,
  `signature_valid`   TINYINT(1) NOT NULL DEFAULT 0,
  `processado`        TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = atualizou status da transferência',
  `erro_processamento` TEXT DEFAULT NULL,
  `ip_origem`         VARCHAR(45) DEFAULT NULL,
  `recebido_em`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cora_transfer` (`cora_transfer_id`),
  KEY `idx_evento`        (`evento`),
  KEY `idx_recebido`      (`recebido_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
