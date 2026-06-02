-- ============================================================
-- 0013_trigger_pago_fondos.sql
-- Trigger: al registrar un pago, crea automáticamente un
-- movimiento de fondos (INGRESO) en fondos_movimientos.
-- Usa SECURITY DEFINER para bypassear RLS de fondos (solo admin).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_pago_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre_cliente TEXT;
  v_importe_banco  NUMERIC(14,2) := 0;
  v_importe_efect  NUMERIC(14,2) := 0;
  v_importe_usd    NUMERIC(14,2) := 0;
BEGIN
  -- Nombre del cliente via la liquidacion
  SELECT c.nombre INTO v_nombre_cliente
  FROM liquidaciones l
  JOIN clientes c ON c.id = l.cliente_id
  WHERE l.id = NEW.liquidacion_id;

  -- Distribuir el importe según tipo de pago
  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'USD' THEN
    v_importe_usd := COALESCE(NEW.importe_usd, 0);
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento,
    fecha,
    concepto,
    importe_banco,
    importe_efectivo,
    importe_usd,
    cheque_id,
    referencia_tipo,
    referencia_id,
    created_by
  ) VALUES (
    'INGRESO',
    NEW.fecha_pago,
    'Cobro cliente: ' || COALESCE(v_nombre_cliente, ''),
    v_importe_banco,
    v_importe_efect,
    v_importe_usd,
    NEW.cheque_id,
    'pago',
    NEW.id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pago_a_fondos
  AFTER INSERT ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_a_fondos();
