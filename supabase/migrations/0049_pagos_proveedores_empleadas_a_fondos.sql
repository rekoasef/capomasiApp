-- ============================================================
-- 0049_pagos_proveedores_empleadas_a_fondos.sql
-- Los pagos a proveedores y los pagos de sueldos a empleadas no
-- generaban movimiento en fondos_movimientos (a diferencia de los
-- recibos de cobranzas, que sí via fn_recibo_a_fondos). El saldo
-- de Fondos quedaba sobreestimado si esos egresos no se cargaban
-- también a mano. Se agregan los triggers simétricos, como EGRESO.
--
-- Ninguna de las dos tablas tiene columna created_by, por eso se
-- usa auth.uid() directo en el trigger (SECURITY DEFINER).
-- No se maneja reversión: ninguno de los dos módulos tiene hoy
-- una operación de anular/eliminar pago (a diferencia de recibos).
-- ============================================================

-- ── 1) Pago a proveedor → EGRESO en fondos ────────────────────

CREATE OR REPLACE FUNCTION fn_pago_proveedor_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_concepto       TEXT;
  v_importe_banco  NUMERIC(14,2) := 0;
  v_importe_efect  NUMERIC(14,2) := 0;
BEGIN
  SELECT 'Pago a proveedor: ' || COALESCE(p.nombre, c.concepto)
    INTO v_concepto
  FROM compras_proveedores c
  LEFT JOIN proveedores p ON p.id = c.proveedor_id
  WHERE c.id = NEW.compra_id;

  IF NEW.tipo_pago IN ('TRANSFERENCIA', 'CHEQUE') THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto, cuenta_bancaria,
    importe_banco, importe_efectivo,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago, COALESCE(v_concepto, 'Pago a proveedor'), NEW.cuenta_bancaria,
    v_importe_banco, v_importe_efect,
    NEW.cheque_id, 'pago_proveedor', NEW.id, auth.uid()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pago_proveedor_a_fondos
  AFTER INSERT ON pagos_proveedores
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_proveedor_a_fondos();

-- ── 2) Pago de sueldo a empleada → EGRESO en fondos ───────────

CREATE OR REPLACE FUNCTION fn_pago_empleada_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre_empleada TEXT;
  v_importe_banco   NUMERIC(14,2) := 0;
  v_importe_efect   NUMERIC(14,2) := 0;
BEGIN
  SELECT nombre INTO v_nombre_empleada FROM empleadas WHERE id = NEW.empleada_id;

  IF NEW.tipo_pago IN ('TRANSFERENCIA', 'CHEQUE') THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto, cuenta_bancaria,
    importe_banco, importe_efectivo,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago,
    'Pago sueldo: ' || COALESCE(v_nombre_empleada, '') || ' (' || NEW.periodo_mes || '/' || NEW.periodo_anio || ')',
    NEW.cuenta_bancaria,
    v_importe_banco, v_importe_efect,
    NEW.cheque_id, 'pago_empleada', NEW.id, auth.uid()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pago_empleada_a_fondos
  AFTER INSERT ON pagos_empleadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_empleada_a_fondos();
