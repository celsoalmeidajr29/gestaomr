-- ============================================================================
-- Migração 002 — Triggers de auditoria para demais entidades
-- Compatível com phpMyAdmin (sem DELIMITER, sem BEGIN...END)
-- ============================================================================

DROP TRIGGER IF EXISTS `trg_lancamentos_after_insert`;
CREATE TRIGGER `trg_lancamentos_after_insert` AFTER INSERT ON `lancamentos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'lancamentos', NEW.id, JSON_OBJECT(
    'data', NEW.data, 'servico_id', NEW.servico_id,
    'total_fatura', NEW.total_fatura, 'status', NEW.status
  ));

DROP TRIGGER IF EXISTS `trg_lancamentos_after_update`;
CREATE TRIGGER `trg_lancamentos_after_update` AFTER UPDATE ON `lancamentos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'lancamentos', NEW.id,
    JSON_OBJECT('data', OLD.data, 'total_fatura', OLD.total_fatura, 'status', OLD.status),
    JSON_OBJECT('data', NEW.data, 'total_fatura', NEW.total_fatura, 'status', NEW.status)
  );

DROP TRIGGER IF EXISTS `trg_lancamentos_after_delete`;
CREATE TRIGGER `trg_lancamentos_after_delete` AFTER DELETE ON `lancamentos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'lancamentos', OLD.id, JSON_OBJECT(
    'data', OLD.data, 'servico_id', OLD.servico_id, 'total_fatura', OLD.total_fatura
  ));

-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_fechamentos_after_insert`;
CREATE TRIGGER `trg_fechamentos_after_insert` AFTER INSERT ON `fechamentos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'fechamentos', NEW.id, JSON_OBJECT(
    'numero', NEW.numero, 'cliente_id', NEW.cliente_id,
    'competencia', NEW.competencia, 'total_fatura', NEW.total_fatura,
    'status_fatura', NEW.status_fatura
  ));

DROP TRIGGER IF EXISTS `trg_fechamentos_after_update`;
CREATE TRIGGER `trg_fechamentos_after_update` AFTER UPDATE ON `fechamentos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'fechamentos', NEW.id,
    JSON_OBJECT('status_fatura', OLD.status_fatura, 'total_fatura', OLD.total_fatura),
    JSON_OBJECT('status_fatura', NEW.status_fatura, 'total_fatura', NEW.total_fatura)
  );

DROP TRIGGER IF EXISTS `trg_fechamentos_after_delete`;
CREATE TRIGGER `trg_fechamentos_after_delete` AFTER DELETE ON `fechamentos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'fechamentos', OLD.id, JSON_OBJECT(
    'numero', OLD.numero, 'cliente_id', OLD.cliente_id,
    'competencia', OLD.competencia, 'total_fatura', OLD.total_fatura
  ));

-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_funcionarios_after_insert`;
CREATE TRIGGER `trg_funcionarios_after_insert` AFTER INSERT ON `funcionarios`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'funcionarios', NEW.id, JSON_OBJECT(
    'nome', NEW.nome, 'categoria', NEW.categoria,
    'status', NEW.status, 'salario_fixo', NEW.salario_fixo
  ));

DROP TRIGGER IF EXISTS `trg_funcionarios_after_update`;
CREATE TRIGGER `trg_funcionarios_after_update` AFTER UPDATE ON `funcionarios`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'funcionarios', NEW.id,
    JSON_OBJECT('nome', OLD.nome, 'categoria', OLD.categoria, 'status', OLD.status, 'salario_fixo', OLD.salario_fixo),
    JSON_OBJECT('nome', NEW.nome, 'categoria', NEW.categoria, 'status', NEW.status, 'salario_fixo', NEW.salario_fixo)
  );

DROP TRIGGER IF EXISTS `trg_funcionarios_after_delete`;
CREATE TRIGGER `trg_funcionarios_after_delete` AFTER DELETE ON `funcionarios`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'funcionarios', OLD.id, JSON_OBJECT(
    'nome', OLD.nome, 'categoria', OLD.categoria
  ));

-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_despesas_after_insert`;
CREATE TRIGGER `trg_despesas_after_insert` AFTER INSERT ON `despesas`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'despesas', NEW.id, JSON_OBJECT(
    'descricao', NEW.descricao, 'tipo', NEW.tipo,
    'valor', NEW.valor, 'competencia', NEW.competencia, 'status', NEW.status
  ));

DROP TRIGGER IF EXISTS `trg_despesas_after_update`;
CREATE TRIGGER `trg_despesas_after_update` AFTER UPDATE ON `despesas`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'despesas', NEW.id,
    JSON_OBJECT('descricao', OLD.descricao, 'valor', OLD.valor, 'status', OLD.status),
    JSON_OBJECT('descricao', NEW.descricao, 'valor', NEW.valor, 'status', NEW.status)
  );

DROP TRIGGER IF EXISTS `trg_despesas_after_delete`;
CREATE TRIGGER `trg_despesas_after_delete` AFTER DELETE ON `despesas`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'despesas', OLD.id, JSON_OBJECT(
    'descricao', OLD.descricao, 'valor', OLD.valor, 'competencia', OLD.competencia
  ));

-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_descontos_after_insert`;
CREATE TRIGGER `trg_descontos_after_insert` AFTER INSERT ON `descontos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'descontos', NEW.id, JSON_OBJECT(
    'funcionario_id', NEW.funcionario_id, 'tipo_vale', NEW.tipo_vale,
    'valor', NEW.valor, 'competencia', NEW.competencia
  ));

DROP TRIGGER IF EXISTS `trg_descontos_after_update`;
CREATE TRIGGER `trg_descontos_after_update` AFTER UPDATE ON `descontos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'descontos', NEW.id,
    JSON_OBJECT('tipo_vale', OLD.tipo_vale, 'valor', OLD.valor),
    JSON_OBJECT('tipo_vale', NEW.tipo_vale, 'valor', NEW.valor)
  );

DROP TRIGGER IF EXISTS `trg_descontos_after_delete`;
CREATE TRIGGER `trg_descontos_after_delete` AFTER DELETE ON `descontos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'descontos', OLD.id, JSON_OBJECT(
    'funcionario_id', OLD.funcionario_id, 'tipo_vale', OLD.tipo_vale, 'valor', OLD.valor
  ));
