-- Migration 022: suporte a duas contas Google por usuário no Cérebro
-- slot 0 = conta principal (Agenda, Tarefas, Drive, Gmail)
-- slot 1 = conta secundária (apenas Gmail)
-- Executar no phpMyAdmin antes de usar a segunda conta de e-mail.

ALTER TABLE cerebro_tokens
  ADD COLUMN slot TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT '0=conta principal 1=conta secundaria'
    AFTER usuario_id,
  ADD COLUMN email VARCHAR(255) DEFAULT NULL
    COMMENT 'E-mail da conta Google conectada'
    AFTER slot;

ALTER TABLE cerebro_tokens
  DROP INDEX uq_usuario;

ALTER TABLE cerebro_tokens
  ADD UNIQUE KEY uq_usuario_slot (usuario_id, slot);
