-- Migration 018: email_logs table for full email history
-- Run in phpMyAdmin before deploying v1.0.1

CREATE TABLE IF NOT EXISTS email_logs (
  id             INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo           VARCHAR(40)      NOT NULL COMMENT 'ex: medicao, proposta',
  referencia_id  INT UNSIGNED     NULL     COMMENT 'fechamento_id ou proposta_id',
  assunto        VARCHAR(255)     NOT NULL,
  destinatarios  JSON             NOT NULL COMMENT 'Array de e-mails',
  enviado_por    INT UNSIGNED     NULL     COMMENT 'usuarios.id',
  enviado_em     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status         ENUM('ok','erro') NOT NULL DEFAULT 'ok',
  erros          JSON             NULL,
  CONSTRAINT fk_email_logs_user FOREIGN KEY (enviado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
