-- ============================================================
-- 0084_ajustar_saldo_fondos.sql
--
-- Pedido de Paola (2026-09-17), mirando la tarjeta de Dólares:
-- decía US$ 50 porque en la base solo hay un egreso de US$ 750 y
-- un ingreso de US$ 800. La resta está bien, pero **los 750 ya los
-- tenía antes de que el sistema existiera**: nunca se cargó un
-- saldo inicial de caja. Lo mismo le puede pasar en cualquier
-- cuenta cada vez que arrastra plata de antes o se le escapa un
-- movimiento.
--
-- Hasta ahora la única salida era inventar un INGRESO o un EGRESO
-- suelto con "Registrar movimiento" y elegir un concepto de la
-- lista que no dice nada del ajuste. Queda indistinguible de un
-- movimiento real de plata y deforma los reportes.
--
-- Esta función le deja decir **cuánto tiene realmente** en una
-- cuenta. La diferencia contra el saldo calculado se escribe como
-- un movimiento más:
--
--   · falta plata  → INGRESO por la diferencia
--   · sobra plata  → EGRESO  por la diferencia
--
-- No se toca ninguna fila vieja ni se guarda el saldo en una
-- columna: v_saldo_fondos sigue siendo la suma de los movimientos,
-- y el ajuste es uno de ellos. Así el saldo cierra sin que deje de
-- ser auditable de dónde salió cada peso.
--
-- **La nota es obligatoria.** Es el único dato que explica por qué
-- el sistema estaba equivocado, y sin ella el ajuste es un número
-- sin origen. Se marcan con referencia_tipo = 'ajuste_saldo' para
-- poder distinguirlos de la plata que entró o salió de verdad.
--
-- Solo las cuatro cuentas fungibles (banco, efectivo, usd,
-- tarallo), igual que fn_transferir_fondos. **Cheques en cartera
-- queda afuera a propósito**: ese saldo es la suma de los cheques
-- que están EN_CARTERA, así que ajustarlo a mano lo desincronizaría
-- de la tabla `cheques` y la cartera mostraría un total que no se
-- corresponde con ningún cheque de la lista. Si ahí hay una
-- diferencia, se arregla con el cheque que falta o sobra (0082).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_ajustar_saldo_fondos(
  p_cuenta     TEXT,
  p_saldo_real NUMERIC,
  p_fecha      DATE,
  p_notas      TEXT
)
RETURNS SETOF fondos_movimientos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuentas       TEXT[] := ARRAY['banco', 'efectivo', 'usd', 'taralo'];
  v_saldo_actual  NUMERIC;
  v_diferencia    NUMERIC;
  v_tipo          TEXT;
  v_importe       NUMERIC;
  v_etiqueta      TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede ajustar el saldo de una cuenta';
  END IF;

  IF NOT (p_cuenta = ANY(v_cuentas)) THEN
    RAISE EXCEPTION 'Cuenta inválida: %. Cheques en cartera no se ajusta a mano.', p_cuenta;
  END IF;

  IF p_saldo_real IS NULL THEN
    RAISE EXCEPTION 'Cargá el saldo real de la cuenta';
  END IF;

  -- La nota es el único dato que explica el ajuste: sin ella no se
  -- guarda. btrim para que un par de espacios no cuenten como nota.
  IF p_notas IS NULL OR btrim(p_notas) = '' THEN
    RAISE EXCEPTION 'Escribí una nota explicando por qué se ajusta el saldo';
  END IF;

  SELECT CASE p_cuenta
           WHEN 'banco'    THEN saldo_banco
           WHEN 'efectivo' THEN saldo_efectivo
           WHEN 'usd'      THEN saldo_usd
           WHEN 'taralo'   THEN saldo_taralo
         END
    INTO v_saldo_actual
    FROM v_saldo_fondos;

  v_saldo_actual := ROUND(COALESCE(v_saldo_actual, 0), 2);
  v_diferencia   := ROUND(p_saldo_real, 2) - v_saldo_actual;

  IF v_diferencia = 0 THEN
    RAISE EXCEPTION 'El saldo de la cuenta ya es ese, no hay nada que ajustar';
  END IF;

  -- Falta plata en el sistema → entra. Sobra → sale.
  v_tipo    := CASE WHEN v_diferencia > 0 THEN 'INGRESO' ELSE 'EGRESO' END;
  v_importe := ABS(v_diferencia);

  v_etiqueta := CASE p_cuenta
                  WHEN 'banco'    THEN 'Banco'
                  WHEN 'efectivo' THEN 'Efectivo'
                  WHEN 'usd'      THEN 'Dólares'
                  WHEN 'taralo'   THEN 'Tarallo'
                END;

  RETURN QUERY
  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo, importe_usd, importe_taralo,
    referencia_tipo, notas, created_by
  ) VALUES (
    v_tipo, p_fecha, 'Ajuste de saldo — ' || v_etiqueta,
    CASE WHEN p_cuenta = 'banco'    THEN v_importe ELSE 0 END,
    CASE WHEN p_cuenta = 'efectivo' THEN v_importe ELSE 0 END,
    CASE WHEN p_cuenta = 'usd'      THEN v_importe ELSE 0 END,
    CASE WHEN p_cuenta = 'taralo'   THEN v_importe ELSE 0 END,
    'ajuste_saldo', btrim(p_notas), auth.uid()
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION fn_ajustar_saldo_fondos(TEXT, NUMERIC, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_ajustar_saldo_fondos(TEXT, NUMERIC, DATE, TEXT) TO authenticated;
