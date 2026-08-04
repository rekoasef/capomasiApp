-- ============================================================
-- 0061_transferencia_fondos.sql
-- No había forma de mover plata entre cuentas de Fondos (ej:
-- retirar efectivo y depositarlo en el banco) — el form manual
-- de "Registrar movimiento" solo permite cargar importes
-- positivos sueltos, sin vincular un origen con un destino.
--
-- Se agrega fn_transferir_fondos: genera un par de movimientos
-- (EGRESO en la cuenta origen + INGRESO en la cuenta destino),
-- vinculados por un mismo referencia_id, para que la transferencia
-- quede registrada y sea auditable en el listado de Fondos igual
-- que cualquier otro movimiento. Cuentas fungibles únicamente
-- (banco, efectivo, usd, taralo) — cheques en cartera queda fuera
-- porque está atado al lifecycle de cada cheque individual, no es
-- un pozo de plata genérico.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_transferir_fondos(
  p_origen   TEXT,
  p_destino  TEXT,
  p_importe  NUMERIC,
  p_fecha    DATE,
  p_concepto TEXT,
  p_notas    TEXT DEFAULT NULL
)
RETURNS SETOF fondos_movimientos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref_id UUID := gen_random_uuid();
  v_cuentas TEXT[] := ARRAY['banco', 'efectivo', 'usd', 'taralo'];
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede transferir fondos entre cuentas';
  END IF;

  IF NOT (p_origen = ANY(v_cuentas)) OR NOT (p_destino = ANY(v_cuentas)) THEN
    RAISE EXCEPTION 'Cuenta inválida: % / %', p_origen, p_destino;
  END IF;

  IF p_origen = p_destino THEN
    RAISE EXCEPTION 'El origen y el destino no pueden ser la misma cuenta';
  END IF;

  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser mayor a 0';
  END IF;

  RETURN QUERY
  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo, importe_usd, importe_taralo,
    referencia_tipo, referencia_id, notas, created_by
  ) VALUES
  (
    'EGRESO', p_fecha, 'Transferencia a ' || p_destino || ': ' || p_concepto,
    CASE WHEN p_origen = 'banco' THEN p_importe ELSE 0 END,
    CASE WHEN p_origen = 'efectivo' THEN p_importe ELSE 0 END,
    CASE WHEN p_origen = 'usd' THEN p_importe ELSE 0 END,
    CASE WHEN p_origen = 'taralo' THEN p_importe ELSE 0 END,
    'transferencia_interna', v_ref_id, p_notas, auth.uid()
  ),
  (
    'INGRESO', p_fecha, 'Transferencia desde ' || p_origen || ': ' || p_concepto,
    CASE WHEN p_destino = 'banco' THEN p_importe ELSE 0 END,
    CASE WHEN p_destino = 'efectivo' THEN p_importe ELSE 0 END,
    CASE WHEN p_destino = 'usd' THEN p_importe ELSE 0 END,
    CASE WHEN p_destino = 'taralo' THEN p_importe ELSE 0 END,
    'transferencia_interna', v_ref_id, p_notas, auth.uid()
  )
  RETURNING *;
END;
$$;
