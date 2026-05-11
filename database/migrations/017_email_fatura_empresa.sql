-- Migration 017: email list per client, email send timestamp and empresa_faturante on fechamentos
-- Run in phpMyAdmin before deploying v1.0.1

ALTER TABLE clientes
  ADD COLUMN emails_cobranca JSON NULL COMMENT 'Lista de e-mails para envio de medicao' AFTER contato_email;

ALTER TABLE fechamentos
  ADD COLUMN enviado_em      DATETIME     NULL COMMENT 'Data/hora do ultimo envio de medicao por e-mail' AFTER data_nf,
  ADD COLUMN empresa_faturante VARCHAR(120) NULL COMMENT 'Empresa que faturou (ex: MR ASSESSORIA, UP VIGILANCIA)' AFTER enviado_em;
