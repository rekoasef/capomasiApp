-- ============================================================
-- 0041_compensacion_tipo_pago.sql
-- Agrega "Compensación" como medio de pago de recibos (pedido de
-- Paola: compensar saldos con un cliente sin movimiento de plata,
-- ej. trueque de servicios).
-- ============================================================

ALTER TABLE recibos
  DROP CONSTRAINT IF EXISTS recibos_tipo_pago_check;

ALTER TABLE recibos
  ADD CONSTRAINT recibos_tipo_pago_check
  CHECK (tipo_pago IN ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'USD', 'COMPENSACION'));

INSERT INTO parametros (categoria, codigo, descripcion, orden)
VALUES ('TIPO_PAGO', 'COMPENSACION', 'Compensación', 5)
ON CONFLICT DO NOTHING;
