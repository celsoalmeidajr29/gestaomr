-- Migration 010: estende ENUM de folhas.status para suportar fluxo Cora
-- v88 introduziu status pendente/transferido/pago/cancelada no frontend.
-- O ENUM antigo (aberta/processada/paga) precisa acomodar:
--   - 'transferido' (PIX enviado ao Cora, aguardando aprovação no app)
--   - 'cancelada' (rejeitada/cancelada)
--   - 'pago' (alias semântico de 'paga'; mantemos 'paga' por compat e adicionamos 'pago')
--
-- Mapeamento legado mantido pelo frontend:
--   aberta/processada → pendente (apenas exibição; valor no DB pode permanecer)
--   paga              → pago     (apenas exibição; novo registros gravam 'pago')

ALTER TABLE `folhas`
  MODIFY `status` ENUM('aberta','processada','paga','pendente','transferido','pago','cancelada')
  NOT NULL DEFAULT 'pendente';
