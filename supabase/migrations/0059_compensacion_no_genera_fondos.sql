-- ============================================================
-- 0059_compensacion_no_genera_fondos.sql
-- Un recibo con tipo_pago = 'COMPENSACION' (Paola hace un trabajo
-- a cambio del trabajo del cliente, sin que entre plata real) no
-- representa ningún movimiento de fondos. Hasta ahora igual
-- generaba una fila en fondos_movimientos con banco/efectivo/USD/
-- cheques_cartera en 0, que aparecía como una entrada fantasma
-- en el listado de Fondos. El trigger ahora no inserta nada en
-- ese caso — sigue sumando a la cuenta corriente del cliente vía
-- v_cuenta_corriente (eso no cambia).
-- ============================================================

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
  IF NEW.tipo_pago = 'COMPENSACION' THEN
    RETURN NEW;
  END IF;

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
