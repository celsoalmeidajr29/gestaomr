-- Migration 021: Módulo Cérebro — acesso no Hub + tabela de tokens Google OAuth2
-- Executar no phpMyAdmin antes de usar o módulo Cérebro

-- 1. Coluna de acesso ao Cérebro na tabela de usuários
ALTER TABLE usuarios
  ADD COLUMN acesso_cerebro TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
  COMMENT 'Acesso ao módulo Cérebro no Hub' AFTER acesso_pareceto;

-- 2. Tabela de tokens Google OAuth2 (1 token por usuário)
CREATE TABLE IF NOT EXISTS cerebro_tokens (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,
  access_token  TEXT         NOT NULL,
  refresh_token TEXT,
  expires_at    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Unix timestamp de expiração do access_token',
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario (usuario_id),
  CONSTRAINT fk_ct_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
