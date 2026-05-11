-- Migration 016: Pare Certo - tabelas de registros individuais (vendas e irregularidades)
-- Cada venda eh unica por placa; cada irregularidade eh unica por id_csv (Identificador do CSV)

CREATE TABLE IF NOT EXISTS pc_vendas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  placa         VARCHAR(10) NOT NULL,
  dt_registro   DATETIME,
  dt_inicial    DATETIME,
  periodo       VARCHAR(50),
  usuario       VARCHAR(100),
  cargo         VARCHAR(50),
  origem        TEXT,
  trecho        TEXT,
  forma_pag     VARCHAR(80),
  valor         DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  irregular     TINYINT(1) NOT NULL DEFAULT 0,
  canal         VARCHAR(30),
  zona          VARCHAR(30),
  tipo          VARCHAR(60),
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_placa (placa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pc_irregularidades (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_csv        VARCHAR(80) NOT NULL,
  dt_emissao    DATETIME,
  status        VARCHAR(20) NOT NULL DEFAULT 'Irregular',
  emissor       VARCHAR(100),
  cargo         VARCHAR(50),
  trecho        TEXT,
  placa         VARCHAR(10),
  valor         DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  origem_class  VARCHAR(30),
  semana        VARCHAR(30),
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_id_csv (id_csv)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
