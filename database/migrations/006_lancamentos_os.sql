-- ============================================================================
-- Migração 006 — Campos faltantes na tabela lancamentos
-- Adiciona `os` (numero da OS, editável desde v48) e `nome_feriado`
-- (já usados no frontend e nunca persistidos no banco).
-- Compatível com phpMyAdmin (sem DELIMITER, sem BEGIN...END)
-- ============================================================================

ALTER TABLE lancamentos
  ADD COLUMN `os`            VARCHAR(20)  DEFAULT NULL AFTER `id`,
  ADD COLUMN `nome_feriado`  VARCHAR(120) DEFAULT NULL AFTER `is_feriado`,
  ADD KEY `idx_os` (`os`);
