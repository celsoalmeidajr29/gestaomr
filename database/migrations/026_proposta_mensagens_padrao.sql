-- Migration 026: Mensagens pré-definidas para propostas comerciais
-- Criado em: 2026-05-16

CREATE TABLE IF NOT EXISTS proposta_mensagens_padrao (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo         ENUM('objeto','faturamento','prazo','observacao') NOT NULL,
  titulo       VARCHAR(100) NOT NULL,
  conteudo     TEXT         NOT NULL,
  ativo        TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
