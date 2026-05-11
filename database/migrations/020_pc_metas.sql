-- Migration 020: pc_metas — metas mensais por funcionario no Pare Certo
-- Rode UMA VEZ no phpMyAdmin antes de usar a aba Configuracoes > Metas.

CREATE TABLE IF NOT EXISTS pc_metas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  funcionario_nome VARCHAR(200) NOT NULL,
  mes             CHAR(7)      NOT NULL COMMENT 'AAAA-MM',
  meta_trans      INT          NOT NULL DEFAULT 0,
  meta_valor      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  criado_em       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_func_mes (funcionario_nome, mes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
