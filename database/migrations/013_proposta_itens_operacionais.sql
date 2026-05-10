-- ============================================================================
-- Migration 013 — Campos operacionais em proposta_itens (para ESCOLTA)
-- ============================================================================
-- Acrescenta os campos comerciais que precisam ser negociados em propostas
-- de ESCOLTA (e copiados pro catálogo na conversão):
--   • franquia_horas, franquia_km          — limite incluso na diária
--   • hora_extra_fatura, km_extra_fatura   — preço unitário cobrado do cliente
--   • adicional_domingos_fatura            — adicional de domingos (cobrado)
--   • aliquota                              — % de imposto retido
--
-- Em propostas FACILITIES esses campos ficam NULL/0 (não se aplicam).
--
-- Idempotente — pode rodar várias vezes (MySQL 8.0+).
-- ============================================================================

ALTER TABLE `proposta_itens` ADD COLUMN IF NOT EXISTS `franquia_horas`             DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER `categoria_servico`;
ALTER TABLE `proposta_itens` ADD COLUMN IF NOT EXISTS `franquia_km`                DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER `franquia_horas`;
ALTER TABLE `proposta_itens` ADD COLUMN IF NOT EXISTS `hora_extra_fatura`          DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER `franquia_km`;
ALTER TABLE `proposta_itens` ADD COLUMN IF NOT EXISTS `km_extra_fatura`            DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER `hora_extra_fatura`;
ALTER TABLE `proposta_itens` ADD COLUMN IF NOT EXISTS `adicional_domingos_fatura`  DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER `km_extra_fatura`;
ALTER TABLE `proposta_itens` ADD COLUMN IF NOT EXISTS `aliquota`                   DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER `adicional_domingos_fatura`;
