-- ============================================================
-- 0048_fondos_notas.sql
-- Observación libre por movimiento de fondos (a mano, ej. para
-- dejar detalle de un aporte a Taralo, una compra de dólares o
-- cualquier otro movimiento manual).
-- ============================================================

ALTER TABLE fondos_movimientos
  ADD COLUMN IF NOT EXISTS notas TEXT;
