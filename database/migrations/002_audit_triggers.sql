-- ============================================================================
-- Migração 002 — Triggers de auditoria para demais entidades
-- Autor: Claude Code  |  Data: 2026-05-03
--
-- Pré-requisito: schema.sql (migração 001) já aplicado.
-- Aplica triggers AFTER INSERT/UPDATE/DELETE para as entidades:
--   lancamentos, fechamentos, funcionarios, despesas, descontos
--
-- O campo @usuario_id é injetado por _bootstrap.php em todo request
-- autenticado antes de qualquer operação no banco.
-- ============================================================================

DELIMITER $$

-- ----------------------------------------------------------------------------
-- lancamentos
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_lancamentos_after_insert`$$
CREATE TRIGGER `trg_lancamentos_after_insert` AFTER INSERT ON `lancamentos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'lancamentos', NEW.id, JSON_OBJECT(
    'data', NEW.data,
    'servico_id', NEW.servico_id,
    'cliente_id', NEW.cliente_id,
    'valor_total', NEW.valor_total,
    'status', NEW.status
  ));
END$$

DROP TRIGGER IF EXISTS `trg_lancamentos_after_update`$$
CREATE TRIGGER `trg_lancamentos_after_update` AFTER UPDATE ON `lancamentos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'lancamentos', NEW.id,
    JSON_OBJECT(
      'data', OLD.data,
      'servico_id', OLD.servico_id,
      'valor_total', OLD.valor_total,
      'status', OLD.status
    ),
    JSON_OBJECT(
      'data', NEW.data,
      'servico_id', NEW.servico_id,
      'valor_total', NEW.valor_total,
      'status', NEW.status
    )
  );
END$$

DROP TRIGGER IF EXISTS `trg_lancamentos_after_delete`$$
CREATE TRIGGER `trg_lancamentos_after_delete` AFTER DELETE ON `lancamentos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'lancamentos', OLD.id, JSON_OBJECT(
    'data', OLD.data,
    'servico_id', OLD.servico_id,
    'cliente_id', OLD.cliente_id,
    'valor_total', OLD.valor_total
  ));
END$$

-- ----------------------------------------------------------------------------
-- fechamentos
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_fechamentos_after_insert`$$
CREATE TRIGGER `trg_fechamentos_after_insert` AFTER INSERT ON `fechamentos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'fechamentos', NEW.id, JSON_OBJECT(
    'numero', NEW.numero,
    'cliente_id', NEW.cliente_id,
    'competencia', NEW.competencia,
    'valor_total', NEW.valor_total,
    'status_fatura', NEW.status_fatura
  ));
END$$

DROP TRIGGER IF EXISTS `trg_fechamentos_after_update`$$
CREATE TRIGGER `trg_fechamentos_after_update` AFTER UPDATE ON `fechamentos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'fechamentos', NEW.id,
    JSON_OBJECT(
      'status_fatura', OLD.status_fatura,
      'valor_total', OLD.valor_total,
      'data_vencimento', OLD.data_vencimento
    ),
    JSON_OBJECT(
      'status_fatura', NEW.status_fatura,
      'valor_total', NEW.valor_total,
      'data_vencimento', NEW.data_vencimento
    )
  );
END$$

DROP TRIGGER IF EXISTS `trg_fechamentos_after_delete`$$
CREATE TRIGGER `trg_fechamentos_after_delete` AFTER DELETE ON `fechamentos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'fechamentos', OLD.id, JSON_OBJECT(
    'numero', OLD.numero,
    'cliente_id', OLD.cliente_id,
    'competencia', OLD.competencia,
    'valor_total', OLD.valor_total
  ));
END$$

-- ----------------------------------------------------------------------------
-- funcionarios
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_funcionarios_after_insert`$$
CREATE TRIGGER `trg_funcionarios_after_insert` AFTER INSERT ON `funcionarios`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'funcionarios', NEW.id, JSON_OBJECT(
    'nome', NEW.nome,
    'categoria', NEW.categoria,
    'status', NEW.status,
    'salario_base', NEW.salario_base
  ));
END$$

DROP TRIGGER IF EXISTS `trg_funcionarios_after_update`$$
CREATE TRIGGER `trg_funcionarios_after_update` AFTER UPDATE ON `funcionarios`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'funcionarios', NEW.id,
    JSON_OBJECT(
      'nome', OLD.nome,
      'categoria', OLD.categoria,
      'status', OLD.status,
      'salario_base', OLD.salario_base
    ),
    JSON_OBJECT(
      'nome', NEW.nome,
      'categoria', NEW.categoria,
      'status', NEW.status,
      'salario_base', NEW.salario_base
    )
  );
END$$

DROP TRIGGER IF EXISTS `trg_funcionarios_after_delete`$$
CREATE TRIGGER `trg_funcionarios_after_delete` AFTER DELETE ON `funcionarios`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'funcionarios', OLD.id, JSON_OBJECT(
    'nome', OLD.nome,
    'categoria', OLD.categoria
  ));
END$$

-- ----------------------------------------------------------------------------
-- despesas
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_despesas_after_insert`$$
CREATE TRIGGER `trg_despesas_after_insert` AFTER INSERT ON `despesas`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'despesas', NEW.id, JSON_OBJECT(
    'descricao', NEW.descricao,
    'tipo', NEW.tipo,
    'valor', NEW.valor,
    'competencia', NEW.competencia,
    'status', NEW.status
  ));
END$$

DROP TRIGGER IF EXISTS `trg_despesas_after_update`$$
CREATE TRIGGER `trg_despesas_after_update` AFTER UPDATE ON `despesas`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'despesas', NEW.id,
    JSON_OBJECT('descricao', OLD.descricao, 'valor', OLD.valor, 'status', OLD.status),
    JSON_OBJECT('descricao', NEW.descricao, 'valor', NEW.valor, 'status', NEW.status)
  );
END$$

DROP TRIGGER IF EXISTS `trg_despesas_after_delete`$$
CREATE TRIGGER `trg_despesas_after_delete` AFTER DELETE ON `despesas`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'despesas', OLD.id, JSON_OBJECT(
    'descricao', OLD.descricao,
    'valor', OLD.valor,
    'competencia', OLD.competencia
  ));
END$$

-- ----------------------------------------------------------------------------
-- descontos
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_descontos_after_insert`$$
CREATE TRIGGER `trg_descontos_after_insert` AFTER INSERT ON `descontos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'descontos', NEW.id, JSON_OBJECT(
    'funcionario_id', NEW.funcionario_id,
    'tipo', NEW.tipo,
    'valor', NEW.valor,
    'competencia', NEW.competencia
  ));
END$$

DROP TRIGGER IF EXISTS `trg_descontos_after_update`$$
CREATE TRIGGER `trg_descontos_after_update` AFTER UPDATE ON `descontos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'descontos', NEW.id,
    JSON_OBJECT('tipo', OLD.tipo, 'valor', OLD.valor, 'descricao', OLD.descricao),
    JSON_OBJECT('tipo', NEW.tipo, 'valor', NEW.valor, 'descricao', NEW.descricao)
  );
END$$

DROP TRIGGER IF EXISTS `trg_descontos_after_delete`$$
CREATE TRIGGER `trg_descontos_after_delete` AFTER DELETE ON `descontos`
FOR EACH ROW BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'descontos', OLD.id, JSON_OBJECT(
    'funcionario_id', OLD.funcionario_id,
    'tipo', OLD.tipo,
    'valor', OLD.valor
  ));
END$$

DELIMITER ;
