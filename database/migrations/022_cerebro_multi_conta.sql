-- Migration 022: suporte a duas contas Google por usuário no Cérebro
-- slot 0 = conta principal (Agenda, Tarefas, Drive, Gmail)
-- slot 1 = conta secundária (apenas Gmail)
--
-- Este script é IDEMPOTENTE — pode ser executado mesmo que as colunas
-- slot/email já existam (erro #1060 na primeira tentativa).
-- Execute no phpMyAdmin como procedure completa (botão "Go" único).

DROP PROCEDURE IF EXISTS `_mig022`;
DELIMITER $$
CREATE PROCEDURE `_mig022`()
BEGIN
  -- Adiciona colunas só se ainda não existem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'cerebro_tokens'
      AND COLUMN_NAME  = 'slot'
  ) THEN
    ALTER TABLE cerebro_tokens
      ADD COLUMN slot TINYINT UNSIGNED NOT NULL DEFAULT 0
        COMMENT '0=conta principal 1=conta secundaria'
        AFTER usuario_id,
      ADD COLUMN email VARCHAR(255) DEFAULT NULL
        COMMENT 'E-mail da conta Google conectada'
        AFTER slot;
  END IF;

  -- Dropa FK antiga se ainda existir (ela trava o DROP INDEX abaixo)
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA    = DATABASE()
      AND TABLE_NAME      = 'cerebro_tokens'
      AND CONSTRAINT_NAME = 'fk_ct_usuario'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE cerebro_tokens DROP FOREIGN KEY fk_ct_usuario;
  END IF;

  -- Dropa índice único antigo (usuario_id) se ainda existir
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'cerebro_tokens'
      AND INDEX_NAME   = 'uq_usuario'
    LIMIT 1
  ) THEN
    ALTER TABLE cerebro_tokens DROP INDEX uq_usuario;
  END IF;

  -- Cria novo índice composto (usuario_id, slot) se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'cerebro_tokens'
      AND INDEX_NAME   = 'uq_usuario_slot'
    LIMIT 1
  ) THEN
    ALTER TABLE cerebro_tokens ADD UNIQUE KEY uq_usuario_slot (usuario_id, slot);
  END IF;

  -- Recria FK se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA    = DATABASE()
      AND TABLE_NAME      = 'cerebro_tokens'
      AND CONSTRAINT_NAME = 'fk_ct_usuario'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE cerebro_tokens
      ADD CONSTRAINT fk_ct_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
  END IF;
END$$
DELIMITER ;

CALL `_mig022`();
DROP PROCEDURE IF EXISTS `_mig022`;
