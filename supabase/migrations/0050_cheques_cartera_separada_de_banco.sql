-- ============================================================
-- 0050_cheques_cartera_separada_de_banco.sql
-- Los cheques (recibidos de clientes o emitidos a proveedores)
-- dejan de sumar/restar directo a "Banco" en el momento de
-- cargar el recibo/pago. En cambio van a un apartado nuevo
-- "Cheques en cartera" hasta que se confirma la acreditación
-- bancaria real (acreditacion_confirmada = true) — recién ahí
-- se mueven a "Banco". Si el cheque se marca RECHAZADO o
-- ANULADO, se elimina el movimiento asociado (la plata nunca
-- contó), sea que estuviera en cartera o ya en banco.
-- ============================================================

-- ── 1) Nueva columna en fondos_movimientos + saldo ────────────

ALTER TABLE fondos_movimientos
  ADD COLUMN IF NOT EXISTS importe_cheques_cartera NUMERIC(14,2) DEFAULT 0;

CREATE OR REPLACE VIEW v_saldo_fondos AS
SELECT
  COALESCE(SUM(importe_banco)     FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_banco)   FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_banco,
  COALESCE(SUM(importe_efectivo)  FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_efectivo) FILTER (WHERE tipo_movimiento = 'EGRESO'), 0)  AS saldo_efectivo,
  COALESCE(SUM(importe_usd)       FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_usd)     FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_usd,
  COALESCE(SUM(importe_taralo)    FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_taralo)  FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_taralo,
  COALESCE(SUM(importe_cheques_cartera) FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_cheques_cartera) FILTER (WHERE tipo_movimiento = 'EGRESO'), 0) AS saldo_cheques_cartera
FROM fondos_movimientos;

-- ── 2) Recibos con cheque → cartera, no banco ─────────────────

CREATE OR REPLACE FUNCTION fn_recibo_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre_cliente          TEXT;
  v_importe_banco           NUMERIC(14,2) := 0;
  v_importe_efect           NUMERIC(14,2) := 0;
  v_importe_usd             NUMERIC(14,2) := 0;
  v_importe_cheques_cartera NUMERIC(14,2) := 0;
BEGIN
  SELECT nombre INTO v_nombre_cliente FROM clientes WHERE id = NEW.cliente_id;

  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    v_importe_cheques_cartera := NEW.importe;
  ELSIF NEW.tipo_pago = 'USD' THEN
    v_importe_usd := COALESCE(NEW.importe_usd, 0);
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo, importe_usd, importe_cheques_cartera,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'INGRESO',
    NEW.fecha,
    'Recibo cliente: ' || COALESCE(v_nombre_cliente, ''),
    v_importe_banco, v_importe_efect, v_importe_usd, v_importe_cheques_cartera,
    NEW.cheque_id, 'recibo', NEW.id, NEW.created_by
  );

  RETURN NEW;
END;
$$;

-- ── 3) Pago a proveedor con cheque → cartera, no banco ────────

CREATE OR REPLACE FUNCTION fn_pago_proveedor_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_concepto                TEXT;
  v_importe_banco           NUMERIC(14,2) := 0;
  v_importe_efect           NUMERIC(14,2) := 0;
  v_importe_cheques_cartera NUMERIC(14,2) := 0;
BEGIN
  SELECT 'Pago a proveedor: ' || COALESCE(p.nombre, c.concepto)
    INTO v_concepto
  FROM compras_proveedores c
  LEFT JOIN proveedores p ON p.id = c.proveedor_id
  WHERE c.id = NEW.compra_id;

  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    v_importe_cheques_cartera := NEW.importe;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto, cuenta_bancaria,
    importe_banco, importe_efectivo, importe_cheques_cartera,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago, COALESCE(v_concepto, 'Pago a proveedor'), NEW.cuenta_bancaria,
    v_importe_banco, v_importe_efect, v_importe_cheques_cartera,
    NEW.cheque_id, 'pago_proveedor', NEW.id, auth.uid()
  );

  RETURN NEW;
END;
$$;

-- ── 4) Pago de sueldo con cheque → cartera, no banco ──────────

CREATE OR REPLACE FUNCTION fn_pago_empleada_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre_empleada         TEXT;
  v_importe_banco           NUMERIC(14,2) := 0;
  v_importe_efect           NUMERIC(14,2) := 0;
  v_importe_cheques_cartera NUMERIC(14,2) := 0;
BEGIN
  SELECT nombre INTO v_nombre_empleada FROM empleadas WHERE id = NEW.empleada_id;

  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    v_importe_cheques_cartera := NEW.importe;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto, cuenta_bancaria,
    importe_banco, importe_efectivo, importe_cheques_cartera,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago,
    'Pago sueldo: ' || COALESCE(v_nombre_empleada, '') || ' (' || NEW.periodo_mes || '/' || NEW.periodo_anio || ')',
    NEW.cuenta_bancaria,
    v_importe_banco, v_importe_efect, v_importe_cheques_cartera,
    NEW.cheque_id, 'pago_empleada', NEW.id, auth.uid()
  );

  RETURN NEW;
END;
$$;

-- ── 5) Confirmar/desmarcar acreditación mueve la plata ────────
-- Cartera → Banco al confirmar; Banco → Cartera si se desmarca.

CREATE OR REPLACE FUNCTION fn_mover_cheque_cartera_a_banco()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.acreditacion_confirmada AND NOT OLD.acreditacion_confirmada THEN
    UPDATE fondos_movimientos
       SET importe_banco = importe_banco + importe_cheques_cartera,
           importe_cheques_cartera = 0
     WHERE cheque_id = NEW.id;
  ELSIF NOT NEW.acreditacion_confirmada AND OLD.acreditacion_confirmada THEN
    UPDATE fondos_movimientos
       SET importe_cheques_cartera = importe_cheques_cartera + importe_banco,
           importe_banco = 0
     WHERE cheque_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mover_cheque_cartera_a_banco
  AFTER UPDATE OF acreditacion_confirmada ON cheques
  FOR EACH ROW
  WHEN (NEW.acreditacion_confirmada IS DISTINCT FROM OLD.acreditacion_confirmada)
  EXECUTE FUNCTION fn_mover_cheque_cartera_a_banco();

-- ── 6) Rechazado / Anulado → se borra el movimiento asociado ──
-- Mismo criterio que fn_anular_recibo: la plata nunca contó.

CREATE OR REPLACE FUNCTION fn_reversar_movimiento_cheque_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.estado IN ('RECHAZADO', 'ANULADO') THEN
    DELETE FROM fondos_movimientos WHERE cheque_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reversar_movimiento_cheque_estado
  AFTER UPDATE OF estado ON cheques
  FOR EACH ROW
  WHEN (NEW.estado IS DISTINCT FROM OLD.estado)
  EXECUTE FUNCTION fn_reversar_movimiento_cheque_estado();
