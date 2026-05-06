-- ============================================================================
-- Migração 005 — Triggers de auditoria para a tabela clientes
-- Compatível com phpMyAdmin (sem DELIMITER, sem BEGIN...END)
-- ============================================================================

DROP TRIGGER IF EXISTS `trg_clientes_after_insert`;
CREATE TRIGGER `trg_clientes_after_insert` AFTER INSERT ON `clientes`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'clientes', NEW.id, JSON_OBJECT(
    'nome', NEW.nome, 'cnpj', NEW.cnpj, 'status', NEW.status
  ));

DROP TRIGGER IF EXISTS `trg_clientes_after_update`;
CREATE TRIGGER `trg_clientes_after_update` AFTER UPDATE ON `clientes`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'clientes', NEW.id,
    JSON_OBJECT('nome', OLD.nome, 'status', OLD.status),
    JSON_OBJECT('nome', NEW.nome, 'status', NEW.status)
  );

DROP TRIGGER IF EXISTS `trg_clientes_after_delete`;
CREATE TRIGGER `trg_clientes_after_delete` AFTER DELETE ON `clientes`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'clientes', OLD.id, JSON_OBJECT(
    'nome', OLD.nome, 'cnpj', OLD.cnpj
  ));
