-- ============================================================================
-- Migration 011 — Módulo de Propostas Comerciais
-- ============================================================================
-- Cria 3 tabelas:
--   • propostas       — cabeçalho da proposta (cliente, status, aceite virtual, snapshot)
--   • proposta_itens  — linhas (ESCOLTA via catálogo + FACILITIES manuais)
--   • proposta_aceites_log — log auditável de tentativas de aceite (válidas e inválidas)
--
-- Numeração `P-NNNN`: campo `numero` INT UNIQUE; o backend formata na resposta.
-- Aceite virtual via combo D: token UUID + CNPJ digitado na página pública.
--
-- Idempotente — pode rodar várias vezes (MySQL 8.0+).
-- ============================================================================

CREATE TABLE IF NOT EXISTS `propostas` (
  `id`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero`                INT UNSIGNED NOT NULL COMMENT 'Sequencial P-0001, P-0002...',
  `cliente_id`            INT UNSIGNED DEFAULT NULL COMMENT 'NULL para cliente avulso (ainda não cadastrado)',
  `cliente_nome`          VARCHAR(160) DEFAULT NULL COMMENT 'Snapshot — usado quando cliente_id é NULL ou no PDF',
  `cliente_cnpj`          VARCHAR(18)  NOT NULL COMMENT 'Usado para validar aceite virtual',
  `cliente_email`         VARCHAR(160) DEFAULT NULL COMMENT 'Para envio do link de aceite',
  `categoria`             ENUM('ESCOLTA','FACILITIES') NOT NULL,
  `status`                ENUM('Criada','Enviada','Em análise','Aceita','Rejeitada') NOT NULL DEFAULT 'Criada',
  -- Cabeçalho/dados padrão da proposta
  `condicoes_comerciais`  TEXT DEFAULT NULL,
  `condicoes_faturamento` TEXT DEFAULT NULL,
  `prazos`                TEXT DEFAULT NULL,
  `vencimento`            VARCHAR(80) DEFAULT NULL COMMENT 'Texto livre (ex: "30 dias", "à vista", data específica)',
  `observacoes`           TEXT DEFAULT NULL,
  `valor_total`           DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Soma dos itens (cache)',
  -- Aceite virtual (combo D: token + CNPJ)
  `token`                 CHAR(36) DEFAULT NULL COMMENT 'UUID v4 — gerado quando passa para Enviada',
  `token_expira_em`       DATETIME DEFAULT NULL COMMENT 'Padrão: data_envio + 30 dias',
  `data_envio`            DATETIME DEFAULT NULL,
  `data_aceite`           DATETIME DEFAULT NULL,
  `ip_aceite`             VARCHAR(45) DEFAULT NULL,
  `ua_aceite`             VARCHAR(255) DEFAULT NULL,
  `cnpj_aceite`           VARCHAR(18) DEFAULT NULL COMMENT 'CNPJ digitado pelo cliente no aceite (auditoria)',
  `motivo_rejeicao`       TEXT DEFAULT NULL,
  `snapshot_aceito`       JSON DEFAULT NULL COMMENT 'Cópia imutável da proposta no momento do aceite',
  -- Auditoria
  `criado_por`            INT UNSIGNED DEFAULT NULL,
  `criado_em`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_numero` (`numero`),
  UNIQUE KEY `uk_token`  (`token`),
  KEY `idx_cliente`      (`cliente_id`),
  KEY `idx_status`       (`status`),
  KEY `idx_categoria`    (`categoria`),
  CONSTRAINT `fk_propostas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_propostas_usuario` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Itens da proposta (linhas)
--   • categoria=ESCOLTA  : item pode referenciar um servico do catálogo via servico_origem_id (snapshot dos dados é feito no momento)
--   • categoria=FACILITIES: item é puramente manual (efetivo, escala)
--   • servico_id é preenchido quando o item é convertido em entrada do catálogo (botão "Criar serviço")
-- ============================================================================

CREATE TABLE IF NOT EXISTS `proposta_itens` (
  `id`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `proposta_id`           INT UNSIGNED NOT NULL,
  `ordem`                 SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  -- Comum (ESCOLTA + FACILITIES)
  `descricao`             VARCHAR(255) NOT NULL,
  `quantidade`            DECIMAL(8,2)  NOT NULL DEFAULT 1,
  `valor_unitario`        DECIMAL(12,2) NOT NULL DEFAULT 0,
  `valor_total`           DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- FACILITIES
  `efetivo`               INT UNSIGNED DEFAULT NULL,
  `escala`                VARCHAR(60)  DEFAULT NULL,
  -- ESCOLTA (referência ao catálogo, opcional)
  `servico_origem_id`     INT UNSIGNED DEFAULT NULL COMMENT 'Servico que originou o item (ESCOLTA)',
  `template`              VARCHAR(40)  DEFAULT NULL COMMENT 'Snapshot do template do servico_origem',
  `categoria_servico`     VARCHAR(40)  DEFAULT NULL COMMENT 'Snapshot da categoria do servico_origem',
  -- Conversão para o catálogo (1 item -> 1 servico)
  `servico_id`            INT UNSIGNED DEFAULT NULL COMMENT 'Preenchido quando o item vira entrada do catálogo',
  `convertido_em`         DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_proposta`       (`proposta_id`),
  KEY `idx_servico_origem` (`servico_origem_id`),
  KEY `idx_servico`        (`servico_id`),
  CONSTRAINT `fk_pi_proposta`       FOREIGN KEY (`proposta_id`)       REFERENCES `propostas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pi_servico_origem` FOREIGN KEY (`servico_origem_id`) REFERENCES `servicos`  (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pi_servico`        FOREIGN KEY (`servico_id`)        REFERENCES `servicos`  (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Log auditável de tentativas de aceite (válidas e inválidas)
-- Crítico para prova jurídica e detecção de tentativas de fraude
-- ============================================================================

CREATE TABLE IF NOT EXISTS `proposta_aceites_log` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `proposta_id`     INT UNSIGNED DEFAULT NULL COMMENT 'NULL se token inválido',
  `token`           CHAR(36) DEFAULT NULL,
  `cnpj_digitado`   VARCHAR(18) DEFAULT NULL,
  `resultado`       ENUM('aceito','cnpj_invalido','token_invalido','token_expirado','status_invalido','rejeitado') NOT NULL,
  `ip`              VARCHAR(45) DEFAULT NULL,
  `user_agent`      VARCHAR(255) DEFAULT NULL,
  `recebido_em`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_proposta` (`proposta_id`),
  KEY `idx_token`    (`token`),
  KEY `idx_recebido` (`recebido_em`),
  CONSTRAINT `fk_pal_proposta` FOREIGN KEY (`proposta_id`) REFERENCES `propostas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
