-- Migration 023: adiciona categoria OUTROS em propostas
-- Permite propostas com itens de livre edição (sem catálogo, sem efetivo/escala)
-- Executar no phpMyAdmin antes de criar propostas com modalidade OUTROS.

ALTER TABLE propostas
  MODIFY COLUMN categoria ENUM('ESCOLTA','FACILITIES','OUTROS') NOT NULL;
