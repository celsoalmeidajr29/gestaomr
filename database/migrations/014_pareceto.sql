-- Migration 014 — Pare Certo: cadastro de funcionários + histórico de relatórios
-- Executar no phpMyAdmin antes de usar o sistema Pare Certo

CREATE TABLE IF NOT EXISTS pc_funcionarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(200)  NOT NULL,
  login       VARCHAR(100)  NOT NULL,
  cargo       ENUM('Supervisor','Fiscal','Operador') NOT NULL,
  status      ENUM('Ativo','Inativo') NOT NULL DEFAULT 'Ativo',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pc_relatorios_historico (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  modulo          ENUM('vendas','irregularidades') NOT NULL,
  periodo_inicio  DATE         NOT NULL,
  periodo_fim     DATE         NOT NULL,
  total_registros INT UNSIGNED NOT NULL DEFAULT 0,
  resumo_json     LONGTEXT     NOT NULL COMMENT 'Snapshot agregado do relatório',
  nome_arquivo    VARCHAR(300),
  created_by      INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_modulo_periodo (modulo, periodo_inicio),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
