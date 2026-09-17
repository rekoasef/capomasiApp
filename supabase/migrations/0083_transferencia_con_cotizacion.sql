-- ============================================================
-- 0083_transferencia_con_cotizacion.sql
--
-- Apareció el 2026-09-17 mirando las dos únicas filas con dólares
-- de la base, que Paola cargó a mano: **no había forma correcta de
-- registrar una compra de dólares.**
--
--   · "Registrar movimiento" tiene un solo `tipo_movimiento` por
--     fila, así que "salen pesos / entran dólares" no entra en una
--     fila. La suya quedó como INGRESO de $1.248.000 de efectivo
--     **más** US$800: la plata que gastó entró en vez de salir.
--   · "Transferir entre cuentas" (0061) mueve **el mismo número**
--     de un lado al otro. Efectivo → dólares por $1.248.000 le
--     habría metido 1.248.000 dólares.
--
-- Esta migración le da a la transferencia un importe por lado:
-- `p_importe` es lo que sale del origen y `p_importe_destino` lo
-- que entra al destino. Omitirlo deja el comportamiento viejo
-- (entra lo mismo que sale), así que las llamadas existentes no
-- cambian.
--
-- **Solo se pueden diferenciar cuando hay cambio de moneda**, o
-- sea cuando exactamente una punta es `usd`. Banco, efectivo y
-- tarallo son todos pesos: mover $100 de banco a efectivo tiene
-- que llegar como $100, y dejar que no coincidan sería abrir la
-- puerta a que se pierda plata en una transferencia sin que nadie
-- se entere.
--
-- No se guarda la cotización en una columna: las dos filas quedan
-- unidas por el mismo `referencia_id` y cada una muestra su
-- importe en la columna de su cuenta, así que el tipo de cambio se
-- lee de las dos filas juntas. El formulario lo calcula en vivo
-- mientras ella escribe, para que pueda controlarlo antes de
-- guardar.
--
-- Se hace DROP + CREATE en vez de CREATE OR REPLACE: agregar un
-- parámetro con default crea una **segunda** función en vez de
-- reemplazar la vieja, y las dos sobrecargas dejarían la llamada
-- de seis argumentos ambigua desde PostgREST.
-- ============================================================

DROP FUNCTION IF EXISTS fn_transferir_fondos(TEXT, TEXT, NUMERIC, DATE, TEXT, TEXT);

CREATE OR REPLACE FUNCTION fn_transferir_fondos(
  p_origen          TEXT,
  p_destino         TEXT,
  p_importe         NUMERIC,
  p_fecha           DATE,
  p_concepto        TEXT,
  p_notas           TEXT    DEFAULT NULL,
  p_importe_destino NUMERIC DEFAULT NULL   -- NULL = entra lo mismo que sale
)
RETURNS SETOF fondos_movimientos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref_id          UUID := gen_random_uuid();
  v_cuentas         TEXT[] := ARRAY['banco', 'efectivo', 'usd', 'taralo'];
  v_cambio_moneda   BOOLEAN;
  v_importe_destino NUMERIC;
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

  -- Hay cambio de moneda cuando exactamente una punta es dólares.
  v_cambio_moneda   := (p_origen = 'usd') <> (p_destino = 'usd');
  v_importe_destino := COALESCE(p_importe_destino, p_importe);

  IF v_importe_destino <= 0 THEN
    RAISE EXCEPTION 'Lo que entra en la cuenta destino debe ser mayor a 0';
  END IF;

  IF NOT v_cambio_moneda AND v_importe_destino <> p_importe THEN
    RAISE EXCEPTION 'Entre cuentas en pesos tiene que entrar lo mismo que sale';
  END IF;

  RETURN QUERY
  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo, importe_usd, importe_taralo,
    referencia_tipo, referencia_id, notas, created_by
  ) VALUES
  (
    'EGRESO', p_fecha, 'Transferencia a ' || p_destino || ': ' || p_concepto,
    CASE WHEN p_origen = 'banco'    THEN p_importe ELSE 0 END,
    CASE WHEN p_origen = 'efectivo' THEN p_importe ELSE 0 END,
    CASE WHEN p_origen = 'usd'      THEN p_importe ELSE 0 END,
    CASE WHEN p_origen = 'taralo'   THEN p_importe ELSE 0 END,
    'transferencia_interna', v_ref_id, p_notas, auth.uid()
  ),
  (
    'INGRESO', p_fecha, 'Transferencia desde ' || p_origen || ': ' || p_concepto,
    CASE WHEN p_destino = 'banco'    THEN v_importe_destino ELSE 0 END,
    CASE WHEN p_destino = 'efectivo' THEN v_importe_destino ELSE 0 END,
    CASE WHEN p_destino = 'usd'      THEN v_importe_destino ELSE 0 END,
    CASE WHEN p_destino = 'taralo'   THEN v_importe_destino ELSE 0 END,
    'transferencia_interna', v_ref_id, p_notas, auth.uid()
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION fn_transferir_fondos(TEXT, TEXT, NUMERIC, DATE, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_transferir_fondos(TEXT, TEXT, NUMERIC, DATE, TEXT, TEXT, NUMERIC) TO authenticated;
