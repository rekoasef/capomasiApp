-- ============================================================
-- 0046_cheques_acreditacion_confirmada.sql
-- Tilde manual de acreditación bancaria real (pedido de Paola,
-- reunión 2026-07-16): el banco no siempre avisa cuando un
-- cheque se acredita o se rechaza de verdad. Es un control
-- ADICIONAL al enum `estado` existente, no lo reemplaza — un
-- cheque puede estar DEPOSITADO sin que Paola haya confirmado
-- todavía, en el home banking, que la plata entró de verdad.
-- Aplica tanto a cheques recibidos de clientes como a cheques
-- propios emitidos a proveedores.
-- ============================================================

ALTER TABLE cheques
  ADD COLUMN IF NOT EXISTS acreditacion_confirmada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acreditacion_confirmada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acreditacion_confirmada_by UUID REFERENCES usuarios(id);
