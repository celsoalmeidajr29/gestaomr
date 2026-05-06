-- ============================================================================
-- MRSys - Sistema de Fechamento Financeiro
-- Schema completo do banco de dados MySQL 8.0+
-- ============================================================================
-- Personalizado para: Celso Almeida (Grupo MR)
-- E-mail admin: celso.almeida@grupomr.seg.br
-- Hospedagem: Compartilhada (cPanel)
--
-- COMO IMPORTAR:
-- 1. No painel da hospedagem, abra o phpMyAdmin
-- 2. Crie um banco vazio com nome "mrsys_db" e collation "utf8mb4_unicode_ci"
-- 3. Selecione o banco mrsys_db na lista da esquerda
-- 4. Vá na aba "Importar" e faça upload deste arquivo
-- 5. Clique em "Executar" — todas as 17 tabelas + dados iniciais serão criados
-- 6. Depois rode o gerar_hash.php (ver instruções no fim deste arquivo)
-- ============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '-03:00';

-- Charset e collation padrão do banco
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 1. AUTENTICAÇÃO E CONTROLE DE ACESSO
-- ============================================================================

DROP TABLE IF EXISTS `perfis`;
CREATE TABLE `perfis` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(20) NOT NULL UNIQUE COMMENT 'admin | financeiro | operacional | visualizador',
  `nome` VARCHAR(60) NOT NULL,
  `descricao` VARCHAR(255) DEFAULT NULL,
  `permissoes` JSON NOT NULL COMMENT 'Mapa de permissões: {"servicos": {"r":1,"w":1,"d":0}, ...}',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt via password_hash()',
  `perfil_id` INT UNSIGNED NOT NULL,
  `telefone` VARCHAR(20) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('ATIVO','INATIVO','BLOQUEADO') NOT NULL DEFAULT 'ATIVO',
  `tentativas_login` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `bloqueado_ate` DATETIME DEFAULT NULL,
  `ultimo_login` DATETIME DEFAULT NULL,
  `token_recuperacao` VARCHAR(64) DEFAULT NULL,
  `token_expira_em` DATETIME DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_perfil` (`perfil_id`),
  CONSTRAINT `fk_usuarios_perfil` FOREIGN KEY (`perfil_id`) REFERENCES `perfis` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sessoes`;
CREATE TABLE `sessoes` (
  `id` VARCHAR(64) NOT NULL COMMENT 'session_id (token)',
  `usuario_id` INT UNSIGNED NOT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `criada_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_em` DATETIME NOT NULL,
  `ultima_atividade` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_expira` (`expira_em`),
  CONSTRAINT `fk_sessoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. CADASTROS BASE
-- ============================================================================

DROP TABLE IF EXISTS `clientes`;
CREATE TABLE `clientes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(150) NOT NULL,
  `nome_fantasia` VARCHAR(150) DEFAULT NULL,
  `cnpj` VARCHAR(18) DEFAULT NULL,
  `inscricao_estadual` VARCHAR(30) DEFAULT NULL,
  `endereco` VARCHAR(255) DEFAULT NULL,
  `cep` VARCHAR(10) DEFAULT NULL,
  `cidade` VARCHAR(80) DEFAULT NULL,
  `uf` CHAR(2) DEFAULT NULL,
  `contato_nome` VARCHAR(100) DEFAULT NULL,
  `contato_email` VARCHAR(120) DEFAULT NULL,
  `contato_telefone` VARCHAR(20) DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `status` ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cnpj` (`cnpj`),
  KEY `idx_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `servicos`;
CREATE TABLE `servicos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(20) NOT NULL COMMENT 'Cód da missão (editável, ex: 202604)',
  `cliente_id` INT UNSIGNED NOT NULL,
  `template` VARCHAR(40) NOT NULL COMMENT 'TOMBINI | ESCOLTECH | BRK | NATURA_NOTURNA | NATURA_MOTOLINK | IRB_ITRACKER',
  `descricao` VARCHAR(120) NOT NULL,
  `categoria_servico` ENUM('ARMADA','VELADA','MOTOLINK','PRONTA RESPOSTA','FACILITIES') NOT NULL DEFAULT 'VELADA',
  `cnpj_servico` VARCHAR(18) DEFAULT NULL COMMENT 'CNPJ do tomador (pode diferir do cliente)',
  `emissao` VARCHAR(20) DEFAULT NULL COMMENT 'Cód de emissão NF',
  `franquia_horas` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `franquia_km` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `valor_fatura` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `diaria_paga` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `hora_extra_fatura` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `hora_extra_paga` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `km_extra_fatura` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `km_extra_pago` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `adicional_domingos_fatura` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `adicional_domingos_pago` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `aliquota` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'Alíquota de imposto em % (descontada do lucro)',
  `status` ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo` (`codigo`),
  KEY `idx_cliente` (`cliente_id`),
  KEY `idx_template` (`template`),
  KEY `idx_categoria` (`categoria_servico`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_servicos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `funcionarios`;
CREATE TABLE `funcionarios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo_externo` VARCHAR(20) DEFAULT NULL COMMENT 'ID no sistema antigo (F001, F002...)',
  `nome` VARCHAR(150) NOT NULL,
  `categoria` VARCHAR(60) NOT NULL DEFAULT 'Operacional',
  `funcao` VARCHAR(80) DEFAULT NULL,
  `cpf` VARCHAR(14) DEFAULT NULL,
  `rg` VARCHAR(20) DEFAULT NULL,
  `data_nascimento` DATE DEFAULT NULL,
  `estado_civil` VARCHAR(30) DEFAULT NULL,
  `nacionalidade` VARCHAR(40) NOT NULL DEFAULT 'Brasileira',
  `naturalidade` VARCHAR(80) DEFAULT NULL,
  `telefone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(160) DEFAULT NULL,
  `endereco` VARCHAR(255) DEFAULT NULL,
  `cep` VARCHAR(10) DEFAULT NULL,
  `cidade` VARCHAR(80) DEFAULT NULL,
  `uf` CHAR(2) DEFAULT NULL,
  `salario_fixo` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `valor_diaria` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `tipo_pix` ENUM('CPF','CNPJ','E-mail','Telefone','Aleatória') NOT NULL DEFAULT 'CPF',
  `chave_pix` VARCHAR(160) DEFAULT NULL,
  `data_admissao` DATE DEFAULT NULL,
  `data_demissao` DATE DEFAULT NULL,
  `notas` TEXT DEFAULT NULL,
  `status` ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cpf` (`cpf`),
  KEY `idx_nome` (`nome`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. OPERAÇÃO
-- ============================================================================

DROP TABLE IF EXISTS `lancamentos`;
CREATE TABLE `lancamentos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `servico_id` INT UNSIGNED NOT NULL,
  `data` DATE NOT NULL,
  `is_domingo` TINYINT(1) NOT NULL DEFAULT 0,
  `is_feriado` TINYINT(1) NOT NULL DEFAULT 0,
  `horas_trabalhadas` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `km_rodados` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `pedagio` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `outros` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `batida_extra` DECIMAL(8,2) NOT NULL DEFAULT 0,
  -- Resultados calculados (snapshot no momento da criação)
  `horas_extras` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `km_extras` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `extra_horas_fatura` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `extra_km_fatura` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `adic_dom_fatura` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `extra_horas_paga` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `extra_km_pago` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `adic_dom_pago` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `pedagio_fatura` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `pedagio_reembolso` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `total_fatura` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_pago` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `aliquota_aplicada` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'Alíquota usada no cálculo (snapshot)',
  `imposto` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `lucro` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'totalFatura - totalPago - imposto',
  -- Status e auditoria
  `status` ENUM('pendente','pago','fechado') NOT NULL DEFAULT 'pendente',
  `observacao` TEXT DEFAULT NULL,
  `criado_por` INT UNSIGNED DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_servico_data` (`servico_id`, `data`),
  KEY `idx_data` (`data`),
  KEY `idx_status` (`status`),
  KEY `idx_criado_por` (`criado_por`),
  CONSTRAINT `fk_lancamentos_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`),
  CONSTRAINT `fk_lancamentos_usuario` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `lancamento_funcionarios`;
CREATE TABLE `lancamento_funcionarios` (
  `lancamento_id` INT UNSIGNED NOT NULL,
  `funcionario_id` INT UNSIGNED NOT NULL,
  `papel` VARCHAR(40) DEFAULT NULL COMMENT 'agente | motorista | apoio | etc',
  `participacao_percentual` DECIMAL(5,2) NOT NULL DEFAULT 100 COMMENT 'Porcentagem do total_pago que cabe a este funcionário',
  PRIMARY KEY (`lancamento_id`, `funcionario_id`),
  KEY `idx_funcionario` (`funcionario_id`),
  CONSTRAINT `fk_lf_lanc` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lf_func` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `lancamento_extras`;
CREATE TABLE `lancamento_extras` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lancamento_id` INT UNSIGNED NOT NULL,
  `chave` VARCHAR(40) NOT NULL COMMENT 'base | tipoOp | placa | rota | NF | etc',
  `valor` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lanc_chave` (`lancamento_id`, `chave`),
  CONSTRAINT `fk_le_lanc` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `despesas`;
CREATE TABLE `despesas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `descricao` VARCHAR(255) NOT NULL,
  `competencia` CHAR(7) NOT NULL COMMENT 'AAAA-MM',
  `tipo` ENUM('FIXA','PARCELA','AVULSA') NOT NULL DEFAULT 'AVULSA',
  `valor` DECIMAL(12,2) NOT NULL,
  `centro_custo` VARCHAR(60) DEFAULT NULL,
  `origem` VARCHAR(60) DEFAULT NULL COMMENT 'CARTÃO CORPORATIVO | RICARDO | MANHÃES | etc',
  `data_lancamento` DATE DEFAULT NULL,
  `data_pagamento` DATE DEFAULT NULL,
  `parcela_atual` SMALLINT UNSIGNED DEFAULT NULL,
  `parcela_total` SMALLINT UNSIGNED DEFAULT NULL,
  `status` ENUM('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente',
  `observacoes` TEXT DEFAULT NULL,
  `criado_por` INT UNSIGNED DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_competencia` (`competencia`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_origem` (`origem`),
  CONSTRAINT `fk_despesas_usuario` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `descontos`;
CREATE TABLE `descontos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `funcionario_id` INT UNSIGNED DEFAULT NULL COMMENT 'Pode ser NULL se ainda não vinculado',
  `alvo_nome` VARCHAR(150) NOT NULL COMMENT 'Snapshot do nome (caso o funcionario_id seja NULL ou mude)',
  `competencia` CHAR(7) NOT NULL,
  `tipo_vale` VARCHAR(60) NOT NULL DEFAULT 'VALE' COMMENT 'VALE | COMBUSTÍVEL - GALOP | etc',
  `valor` DECIMAL(10,2) NOT NULL,
  `centro_custo` VARCHAR(60) DEFAULT NULL,
  `forma_pagamento` VARCHAR(60) DEFAULT NULL,
  `data` DATE DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `criado_por` INT UNSIGNED DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_funcionario` (`funcionario_id`),
  KEY `idx_competencia` (`competencia`),
  KEY `idx_alvo_nome` (`alvo_nome`),
  CONSTRAINT `fk_descontos_func` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_descontos_usuario` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. FECHAMENTO
-- ============================================================================

DROP TABLE IF EXISTS `fechamentos`;
CREATE TABLE `fechamentos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero` INT UNSIGNED NOT NULL UNIQUE COMMENT 'Sequencial: F-0001, F-0002...',
  `cliente_id` INT UNSIGNED NOT NULL,
  `template` VARCHAR(40) NOT NULL,
  `competencia` CHAR(7) NOT NULL,
  `data_inicio` DATE DEFAULT NULL COMMENT 'NULL para fechamento mensal padrão',
  `data_fim` DATE DEFAULT NULL,
  `data_fechamento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_vencimento` DATE DEFAULT NULL,
  `data_pagamento` DATE DEFAULT NULL,
  `total_fatura` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total_pago` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total_imposto` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `lucro` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `qtd_lancamentos` INT UNSIGNED NOT NULL DEFAULT 0,
  `status_fatura` ENUM('Enviada','Aprovada','NF-emitida','Paga','Vencida') NOT NULL DEFAULT 'Enviada',
  `numero_nf` VARCHAR(30) DEFAULT NULL,
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Geradas via "por intervalo de datas"',
  `observacoes` TEXT DEFAULT NULL,
  `criado_por` INT UNSIGNED DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cliente` (`cliente_id`),
  KEY `idx_competencia` (`competencia`),
  KEY `idx_status` (`status_fatura`),
  KEY `idx_vencimento` (`data_vencimento`),
  CONSTRAINT `fk_fech_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_fech_usuario` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `fechamento_lancamentos`;
CREATE TABLE `fechamento_lancamentos` (
  `fechamento_id` INT UNSIGNED NOT NULL,
  `lancamento_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`fechamento_id`, `lancamento_id`),
  KEY `idx_lancamento` (`lancamento_id`),
  CONSTRAINT `fk_fl_fech` FOREIGN KEY (`fechamento_id`) REFERENCES `fechamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fl_lanc` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `fechamento_status_log`;
CREATE TABLE `fechamento_status_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fechamento_id` INT UNSIGNED NOT NULL,
  `status_anterior` VARCHAR(30) DEFAULT NULL,
  `status_novo` VARCHAR(30) NOT NULL,
  `usuario_id` INT UNSIGNED DEFAULT NULL,
  `automatico` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 se foi marca automática (ex: vencida)',
  `observacao` VARCHAR(255) DEFAULT NULL,
  `em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fech` (`fechamento_id`),
  KEY `idx_usuario` (`usuario_id`),
  CONSTRAINT `fk_fsl_fech` FOREIGN KEY (`fechamento_id`) REFERENCES `fechamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fsl_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `folhas`;
CREATE TABLE `folhas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `funcionario_id` INT UNSIGNED NOT NULL,
  `competencia` CHAR(7) NOT NULL,
  `total_lancamentos` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Soma das participações em lançamentos',
  `salario_fixo_aplicado` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `adicionais` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `descontos_manuais` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_vales` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `bruto` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `liquido` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `ajustes` JSON DEFAULT NULL COMMENT 'Array de {tipo, descricao, valor}',
  `status` ENUM('aberta','processada','paga') NOT NULL DEFAULT 'aberta',
  `data_processamento` DATETIME DEFAULT NULL,
  `data_pagamento` DATE DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `processado_por` INT UNSIGNED DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_func_competencia` (`funcionario_id`, `competencia`),
  KEY `idx_competencia` (`competencia`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_folhas_func` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`),
  CONSTRAINT `fk_folhas_user` FOREIGN KEY (`processado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. AUXILIARES
-- ============================================================================

DROP TABLE IF EXISTS `arquivos`;
CREATE TABLE `arquivos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entidade_tipo` VARCHAR(40) NOT NULL COMMENT 'funcionario | cliente | despesa | etc',
  `entidade_id` INT UNSIGNED NOT NULL,
  `tipo` ENUM('foto','documento','contrato','comprovante','outro') NOT NULL DEFAULT 'documento',
  `nome_original` VARCHAR(255) NOT NULL,
  `nome_arquivo` VARCHAR(255) NOT NULL COMMENT 'Nome no disco (sanitizado)',
  `caminho` VARCHAR(500) NOT NULL COMMENT '/uploads/funcionarios/{id}/...',
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `tamanho_bytes` INT UNSIGNED NOT NULL DEFAULT 0,
  `descricao` VARCHAR(255) DEFAULT NULL,
  `enviado_por` INT UNSIGNED DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entidade` (`entidade_tipo`, `entidade_id`),
  KEY `idx_tipo` (`tipo`),
  CONSTRAINT `fk_arq_user` FOREIGN KEY (`enviado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `auditoria`;
CREATE TABLE `auditoria` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` INT UNSIGNED DEFAULT NULL,
  `acao` ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','IMPORT') NOT NULL,
  `entidade` VARCHAR(40) NOT NULL COMMENT 'Nome da tabela',
  `entidade_id` INT UNSIGNED DEFAULT NULL,
  `dados_antes` JSON DEFAULT NULL,
  `dados_depois` JSON DEFAULT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_entidade` (`entidade`, `entidade_id`),
  KEY `idx_em` (`em`),
  CONSTRAINT `fk_aud_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DADOS INICIAIS — perfis e usuário admin
-- ============================================================================

INSERT INTO `perfis` (`codigo`, `nome`, `descricao`, `permissoes`) VALUES
('admin', 'Administrador', 'Acesso total ao sistema', JSON_OBJECT(
  'usuarios', JSON_OBJECT('r',1,'w',1,'d',1),
  'servicos', JSON_OBJECT('r',1,'w',1,'d',1),
  'lancamentos', JSON_OBJECT('r',1,'w',1,'d',1),
  'fechamentos', JSON_OBJECT('r',1,'w',1,'d',1),
  'funcionarios', JSON_OBJECT('r',1,'w',1,'d',1),
  'despesas', JSON_OBJECT('r',1,'w',1,'d',1),
  'descontos', JSON_OBJECT('r',1,'w',1,'d',1),
  'folhas', JSON_OBJECT('r',1,'w',1,'d',1),
  'auditoria', JSON_OBJECT('r',1,'w',0,'d',0),
  'backup', JSON_OBJECT('r',1,'w',1,'d',0)
)),
('financeiro', 'Financeiro', 'Despesas, vales, fechamentos, folha', JSON_OBJECT(
  'servicos', JSON_OBJECT('r',1,'w',0,'d',0),
  'lancamentos', JSON_OBJECT('r',1,'w',1,'d',1),
  'fechamentos', JSON_OBJECT('r',1,'w',1,'d',0),
  'funcionarios', JSON_OBJECT('r',1,'w',1,'d',0),
  'despesas', JSON_OBJECT('r',1,'w',1,'d',1),
  'descontos', JSON_OBJECT('r',1,'w',1,'d',1),
  'folhas', JSON_OBJECT('r',1,'w',1,'d',0),
  'auditoria', JSON_OBJECT('r',0,'w',0,'d',0),
  'backup', JSON_OBJECT('r',1,'w',0,'d',0)
)),
('operacional', 'Operacional', 'Lançamentos e cadastros operacionais', JSON_OBJECT(
  'servicos', JSON_OBJECT('r',1,'w',1,'d',0),
  'lancamentos', JSON_OBJECT('r',1,'w',1,'d',0),
  'fechamentos', JSON_OBJECT('r',1,'w',0,'d',0),
  'funcionarios', JSON_OBJECT('r',1,'w',0,'d',0),
  'despesas', JSON_OBJECT('r',0,'w',0,'d',0),
  'descontos', JSON_OBJECT('r',0,'w',0,'d',0),
  'folhas', JSON_OBJECT('r',0,'w',0,'d',0),
  'auditoria', JSON_OBJECT('r',0,'w',0,'d',0),
  'backup', JSON_OBJECT('r',0,'w',0,'d',0)
)),
('visualizador', 'Visualizador', 'Apenas leitura', JSON_OBJECT(
  'servicos', JSON_OBJECT('r',1,'w',0,'d',0),
  'lancamentos', JSON_OBJECT('r',1,'w',0,'d',0),
  'fechamentos', JSON_OBJECT('r',1,'w',0,'d',0),
  'funcionarios', JSON_OBJECT('r',1,'w',0,'d',0),
  'despesas', JSON_OBJECT('r',1,'w',0,'d',0),
  'descontos', JSON_OBJECT('r',1,'w',0,'d',0),
  'folhas', JSON_OBJECT('r',1,'w',0,'d',0),
  'auditoria', JSON_OBJECT('r',0,'w',0,'d',0),
  'backup', JSON_OBJECT('r',0,'w',0,'d',0)
));

-- ============================================================================
-- USUÁRIO ADMINISTRADOR INICIAL
-- ============================================================================
-- IMPORTANTE: o hash abaixo é um PLACEHOLDER. Ele NÃO permite login direto.
-- Para gerar o hash real da senha, siga UM dos dois caminhos:
--
-- CAMINHO 1 (mais fácil): Use a aba SQL do phpMyAdmin DEPOIS de criar o banco.
--   Cole apenas estas duas linhas e execute (substitua a senha entre aspas):
--
--     UPDATE usuarios
--     SET senha_hash = (SELECT JSON_UNQUOTE(JSON_EXTRACT(@h, '$.h')))
--     WHERE email = 'celso.almeida@grupomr.seg.br';
--
-- CAMINHO 2 (recomendado): Crie um arquivo gerar_hash.php em qualquer pasta
-- do servidor com o conteúdo:
--
--     <?php echo password_hash('jr4540504@A', PASSWORD_BCRYPT); ?>
--
-- Acesse pelo navegador, copie o hash retornado e rode no phpMyAdmin:
--
--     UPDATE usuarios
--     SET senha_hash = 'COLE_O_HASH_AQUI'
--     WHERE email = 'celso.almeida@grupomr.seg.br';
--
-- DEPOIS APAGUE o arquivo gerar_hash.php do servidor.
-- ============================================================================

INSERT INTO `usuarios` (`nome`, `email`, `senha_hash`, `perfil_id`, `status`) VALUES
('Celso Almeida', 'celso.almeida@grupomr.seg.br', '$2y$10$PLACEHOLDER.SUBSTITUIR.NO.PHPMYADMIN.APOS.GERAR.HASH.REAL.NO.PHP.AB', 1, 'ATIVO');

-- ============================================================================
-- DADOS INICIAIS — clientes do MRSys atual
-- ============================================================================

INSERT INTO `clientes` (`nome`, `cnpj`, `status`) VALUES
('NATURA COSMÉTICOS S.A', '71.673.990/0001-77', 'ATIVO'),
('IRB LOGÍSTICA ITRACKER', NULL, 'ATIVO'),
('GRUPO TOMBINI', NULL, 'ATIVO'),
('ESCOLTECH', NULL, 'ATIVO'),
('BRK TECNOLOGIA', NULL, 'ATIVO');

-- ============================================================================
-- DADOS INICIAIS — serviços do catálogo atual
-- ============================================================================

INSERT INTO `servicos` (`codigo`, `cliente_id`, `template`, `descricao`, `categoria_servico`, `cnpj_servico`, `emissao`, `franquia_horas`, `franquia_km`, `valor_fatura`, `diaria_paga`, `hora_extra_fatura`, `hora_extra_paga`, `km_extra_fatura`, `km_extra_pago`, `adicional_domingos_fatura`, `adicional_domingos_pago`, `aliquota`, `status`) VALUES
('9999',   (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_NOTURNA',  'GOGÓ',                  'VELADA',   '71.673.990/0001-77', '11.03', 8, 1000, 394.26,   0,    32.89, 20.00, 0,    0,    94.95,  50.00, 15.60, 'ATIVO'),
('103',    (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_NOTURNA',  'NOTURNA DCX',           'VELADA',   '71.673.990/0001-77', '11.03', 8, 1000, 591.41, 250.00, 78.65, 40.00, 0,    0,   147.85,  80.00, 15.60, 'ATIVO'),
('105',    (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_NOTURNA',  'COMBOIO',               'VELADA',   '71.673.990/0001-77', '11.03', 8, 1000, 394.26,   0,    78.65, 40.00, 0,    0,   147.85,  80.00, 15.60, 'ATIVO'),
('104',    (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_NOTURNA',  'NOTURNA SGO',           'VELADA',   '71.673.990/0001-77', '11.03', 8, 1000, 591.41,   0,    78.65, 40.00, 0,    0,   147.85,  80.00, 15.60, 'ATIVO'),
('190',    (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_MOTOLINK', 'MOTOLINK RJ GERAL',     'MOTOLINK', '71.673.990/0001-77', '11.03', 8, 1000, 394.26, 150.00, 34.13, 21.00, 0,    0,    98.55,  52.50, 15.60, 'ATIVO'),
('201',    (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_MOTOLINK', 'MOTOLINK SP NORMAL',    'MOTOLINK', '71.673.990/0001-77', '11.03', 8, 1000, 394.26, 215.00, 34.13, 20.00, 0,    0,    98.55,  50.00, 15.60, 'ATIVO'),
('1000',   (SELECT id FROM clientes WHERE nome='NATURA COSMÉTICOS S.A'), 'NATURA_MOTOLINK', 'MOTOLINK SP REPASSE',   'MOTOLINK', '71.673.990/0001-77', '11.03', 8, 1000, 394.26, 250.00, 34.13, 20.00, 0,    0,    98.55,  50.00, 15.60, 'ATIVO'),
('202501', (SELECT id FROM clientes WHERE nome='IRB LOGÍSTICA ITRACKER'), 'IRB_ITRACKER', 'ITRACKER 3H/100',         'VELADA',   NULL,                 '11.03', 6,  200, 699.90, 300.00, 107.45,40.00, 2.59, 0,   104.99,    0,   8.65, 'ATIVO'),
('202502', (SELECT id FROM clientes WHERE nome='IRB LOGÍSTICA ITRACKER'), 'IRB_ITRACKER', 'ITRACKER 6H/200',         'VELADA',   NULL,                 '11.03', 6,  200, 699.90, 300.00, 107.45,40.00, 2.59, 0,   104.99,    0,   8.65, 'ATIVO'),
('202503', (SELECT id FROM clientes WHERE nome='IRB LOGÍSTICA ITRACKER'), 'IRB_ITRACKER', 'ITRACKER 8H/200',         'VELADA',   NULL,                 '11.03', 8,  200, 789.90, 300.00, 107.50,40.00, 2.59, 0,   118.49,    0,   8.65, 'ATIVO'),
('202504', (SELECT id FROM clientes WHERE nome='IRB LOGÍSTICA ITRACKER'), 'IRB_ITRACKER', 'ITRACKER ARMADA 3H/100',  'ARMADA',   NULL,                 '11.03', 3,  100, 449.90,   0,   107.45,40.00, 2.59, 0,    67.49,    0,   8.65, 'ATIVO'),
('202505', (SELECT id FROM clientes WHERE nome='IRB LOGÍSTICA ITRACKER'), 'IRB_ITRACKER', 'ITRACKER ARMADA 6H/200',  'ARMADA',   NULL,                 '11.03', 6,  200, 799.90,   0,   107.45,40.00, 2.59, 0,   119.99,    0,   8.65, 'ATIVO'),
('202601', (SELECT id FROM clientes WHERE nome='GRUPO TOMBINI'), 'TOMBINI', 'TOMBINI ARMADA',                        'ARMADA',   NULL,                 '11.03', 6,  200, 799.90,   0,   107.50,    0, 2.59, 0,   119.99,    0,   8.65, 'ATIVO'),
('202604', (SELECT id FROM clientes WHERE nome='GRUPO TOMBINI'), 'TOMBINI', 'TOMBINI VELADA',                        'VELADA',   NULL,                 '11.03', 3,  100, 799.90, 350.00, 112.90,40.00, 3.59, 0,   119.99,    0,   8.65, 'ATIVO'),
('202607', (SELECT id FROM clientes WHERE nome='ESCOLTECH'), 'ESCOLTECH', 'ESCOLTECH',                               'VELADA',   NULL,                 '11.03', 3,  100, 349.90,   0,   112.90,    0, 3.59, 0,    52.49,    0,   8.65, 'ATIVO'),
('202603', (SELECT id FROM clientes WHERE nome='BRK TECNOLOGIA'), 'BRK', 'ALPARGATAS 3H/100KM',                     'VELADA',   NULL,                 '11.03', 3,  100, 509.90, 250.00, 112.90,40.00, 3.59, 2.00, 87.48,    0,  15.60, 'ATIVO'),
('202605', (SELECT id FROM clientes WHERE nome='BRK TECNOLOGIA'), 'BRK', 'ALPARGATAS 3H/100KM - DIF',               'VELADA',   NULL,                 '11.03', 3,  100, 509.90, 280.00, 112.90,40.00, 3.59, 2.00,127.48,    0,  15.60, 'ATIVO');

-- ============================================================================
-- VIEWS úteis para relatórios
-- ============================================================================

CREATE OR REPLACE VIEW `vw_lancamentos_completo` AS
SELECT
  l.*,
  s.codigo AS servico_codigo,
  s.descricao AS servico_descricao,
  s.template AS servico_template,
  s.categoria_servico,
  s.aliquota AS servico_aliquota_atual,
  c.id AS cliente_id,
  c.nome AS cliente_nome,
  c.cnpj AS cliente_cnpj,
  GROUP_CONCAT(f.nome ORDER BY f.nome SEPARATOR '; ') AS funcionarios_envolvidos
FROM lancamentos l
INNER JOIN servicos s ON s.id = l.servico_id
INNER JOIN clientes c ON c.id = s.cliente_id
LEFT JOIN lancamento_funcionarios lf ON lf.lancamento_id = l.id
LEFT JOIN funcionarios f ON f.id = lf.funcionario_id
GROUP BY l.id;

CREATE OR REPLACE VIEW `vw_fechamentos_completo` AS
SELECT
  f.*,
  c.nome AS cliente_nome,
  c.cnpj AS cliente_cnpj,
  CONCAT('F-', LPAD(f.numero, 4, '0')) AS numero_formatado,
  CASE
    WHEN f.data_vencimento IS NOT NULL AND f.data_vencimento < CURDATE() AND f.status_fatura NOT IN ('Paga') THEN 1
    ELSE 0
  END AS em_atraso,
  DATEDIFF(CURDATE(), f.data_vencimento) AS dias_atraso
FROM fechamentos f
INNER JOIN clientes c ON c.id = f.cliente_id;

CREATE OR REPLACE VIEW `vw_resumo_competencia` AS
SELECT
  competencia,
  SUM(total_fatura) AS total_faturado,
  SUM(total_pago) AS total_pago,
  SUM(total_imposto) AS total_imposto,
  SUM(lucro) AS total_lucro,
  COUNT(*) AS qtd_fechamentos,
  SUM(CASE WHEN status_fatura = 'Paga' THEN total_fatura ELSE 0 END) AS total_recebido,
  SUM(CASE WHEN status_fatura = 'Vencida' THEN total_fatura ELSE 0 END) AS total_em_atraso
FROM fechamentos
GROUP BY competencia;

-- ============================================================================
-- TRIGGERS — auditoria automática
-- Formato compatível com phpMyAdmin (SQL tab e Import): sem DELIMITER, sem BEGIN...END
-- ============================================================================

-- servicos
CREATE TRIGGER `trg_servicos_after_insert` AFTER INSERT ON `servicos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'servicos', NEW.id, JSON_OBJECT(
    'codigo', NEW.codigo, 'descricao', NEW.descricao, 'cliente_id', NEW.cliente_id,
    'valor_fatura', NEW.valor_fatura, 'aliquota', NEW.aliquota
  ));

CREATE TRIGGER `trg_servicos_after_update` AFTER UPDATE ON `servicos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'servicos', NEW.id,
    JSON_OBJECT('codigo', OLD.codigo, 'descricao', OLD.descricao, 'valor_fatura', OLD.valor_fatura, 'aliquota', OLD.aliquota),
    JSON_OBJECT('codigo', NEW.codigo, 'descricao', NEW.descricao, 'valor_fatura', NEW.valor_fatura, 'aliquota', NEW.aliquota)
  );

CREATE TRIGGER `trg_servicos_after_delete` AFTER DELETE ON `servicos`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'servicos', OLD.id, JSON_OBJECT(
    'codigo', OLD.codigo, 'descricao', OLD.descricao, 'cliente_id', OLD.cliente_id
  ));

-- clientes
CREATE TRIGGER `trg_clientes_after_insert` AFTER INSERT ON `clientes`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_depois)
  VALUES (@usuario_id, 'CREATE', 'clientes', NEW.id, JSON_OBJECT(
    'nome', NEW.nome, 'cnpj', NEW.cnpj, 'status', NEW.status
  ));

CREATE TRIGGER `trg_clientes_after_update` AFTER UPDATE ON `clientes`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  VALUES (@usuario_id, 'UPDATE', 'clientes', NEW.id,
    JSON_OBJECT('nome', OLD.nome, 'status', OLD.status),
    JSON_OBJECT('nome', NEW.nome, 'status', NEW.status)
  );

CREATE TRIGGER `trg_clientes_after_delete` AFTER DELETE ON `clientes`
FOR EACH ROW
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_antes)
  VALUES (@usuario_id, 'DELETE', 'clientes', OLD.id, JSON_OBJECT(
    'nome', OLD.nome, 'cnpj', OLD.cnpj
  ));

-- ============================================================================
-- FIM DO SCRIPT — Verificações e próximos passos
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- VERIFICAÇÃO RÁPIDA (rode na aba SQL após importar):
-- SHOW TABLES;                                    -- deve listar 17 tabelas
-- SELECT COUNT(*) FROM clientes;                  -- 5
-- SELECT COUNT(*) FROM servicos;                  -- 17
-- SELECT * FROM perfis;                           -- 4 perfis
-- SELECT nome, email FROM usuarios;               -- 1 usuário (celso)
--
-- ============================================================================
-- PRÓXIMO PASSO: ATIVAR A SENHA DO ADMIN
-- ============================================================================
-- Neste momento o usuário 'celso.almeida@grupomr.seg.br' existe mas não tem
-- senha funcional (placeholder). Para ativá-la:
--
--   1. Faça upload do arquivo gerar_hash.php para a raiz do site (public_html/)
--   2. Acesse https://seudominio.com.br/gerar_hash.php no navegador
--   3. Copie o comando UPDATE que a página exibe
--   4. Cole na aba SQL do phpMyAdmin e execute
--   5. APAGUE o gerar_hash.php do servidor (segurança crítica)
--
-- Depois disso o login estará funcionando com:
--   E-mail:  celso.almeida@grupomr.seg.br
--   Senha:   (a definida no arquivo gerar_hash.php)
-- ============================================================================

