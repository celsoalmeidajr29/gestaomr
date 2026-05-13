-- Migration 024 — Adiciona coluna prestador em propostas
-- Executar no phpMyAdmin antes de usar o campo de prestador nas propostas.

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS prestador VARCHAR(200) NULL AFTER categoria;
