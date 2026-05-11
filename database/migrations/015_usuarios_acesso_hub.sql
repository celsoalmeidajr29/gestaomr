-- Migration 015: acesso ao Hub por sistema (mrsys / pareceto) por usuario
-- Cada coluna eh um toggle independente, controlado pelo admin na tela de gestao de usuarios.

ALTER TABLE usuarios
  ADD COLUMN acesso_mrsys     TINYINT(1) UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Acesso ao MRSys no Hub' AFTER status,
  ADD COLUMN acesso_pareceto  TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Acesso ao Pare Certo no Hub' AFTER acesso_mrsys;
