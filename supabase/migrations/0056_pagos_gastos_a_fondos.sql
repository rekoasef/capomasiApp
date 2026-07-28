-- ============================================================
-- 0056_pagos_gastos_a_fondos.sql
-- Los gastos (pagos_gastos, módulo Vencimientos > Gastos) no
-- generaban movimiento en fondos_movimientos -- a diferencia de
-- pagos a proveedores y a empleadas (0049), el saldo de Fondos no
-- se enteraba cuando se pagaba un gasto. Se agrega el mismo
-- patrón de trigger.
--
-- pagos_gastos no tiene columna cheque_id (a diferencia de pagos_
-- proveedores/pagos_empleadas), así que un pago con medio_pago=
-- 'CHEQUE' se trata como egreso directo de banco -- no hay cartera
-- de cheques que rastrear acá. TARJETA también va a banco, no
-- existe un bucket separado para tarjeta en fondos_movimientos.
--
-- A diferencia de proveedores/empleadas (que no soportan editar un
-- pago ya cargado), pagos_gastos SÍ tiene un `update()` en el
-- service -- por eso además del trigger de INSERT hace falta uno
-- de UPDATE que borre y regenere el movimiento, para que no quede
-- desincronizado si se edita el importe o el medio de pago.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_pago_gasto_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_importe_banco NUMERIC(14,2) := 0;
  v_importe_efect NUMERIC(14,2) := 0;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM fondos_movimientos WHERE referencia_tipo = 'pago_gasto' AND referencia_id = NEW.id;
  END IF;

  IF NEW.medio_pago IN ('TRANSFERENCIA', 'CHEQUE', 'TARJETA') THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.medio_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo,
    referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago, 'Gasto: ' || NEW.concepto,
    v_importe_banco, v_importe_efect,
    'pago_gasto', NEW.id, NEW.created_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pago_gasto_a_fondos
  AFTER INSERT ON pagos_gastos
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_gasto_a_fondos();

CREATE TRIGGER trigger_pago_gasto_a_fondos_update
  AFTER UPDATE ON pagos_gastos
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_gasto_a_fondos();

-- Backfill: pagos_gastos ya cargados que todavía no tienen su
-- movimiento correspondiente en fondos_movimientos.
INSERT INTO fondos_movimientos (
  tipo_movimiento, fecha, concepto, importe_banco, importe_efectivo,
  referencia_tipo, referencia_id, created_by
)
SELECT
  'EGRESO', pg.fecha_pago, 'Gasto: ' || pg.concepto,
  CASE WHEN pg.medio_pago IN ('TRANSFERENCIA', 'CHEQUE', 'TARJETA') THEN pg.importe ELSE 0 END,
  CASE WHEN pg.medio_pago = 'EFECTIVO' THEN pg.importe ELSE 0 END,
  'pago_gasto', pg.id, pg.created_by
FROM pagos_gastos pg
WHERE NOT EXISTS (
  SELECT 1 FROM fondos_movimientos fm
  WHERE fm.referencia_tipo = 'pago_gasto' AND fm.referencia_id = pg.id
);
