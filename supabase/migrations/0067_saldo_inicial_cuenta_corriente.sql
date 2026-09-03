-- ============================================================
-- 0067_saldo_inicial_cuenta_corriente.sql
-- Paola necesita cargar la deuda que cada cliente traía de antes del sistema,
-- para que aparezca en la cuenta corriente que le manda al cliente y para poder
-- imputarle los cobros que vayan entrando.
--
-- No puede ser una liquidación normal: duplicaría los ingresos contra la
-- facturación histórica ya migrada (tabla facturacion_historica) y contra los
-- reportes. Se usa el tipo_liquidacion = 'SALDO_INICIAL' que ya existe en la
-- tabla desde 0008: queda FUERA de todas las views de ingresos
-- (v_ingresos_mensuales, v_ingresos_por_tipo_mes, v_ingresos_por_empleada_mes,
-- v_ingresos_negro_blanco) y del trigger de auto-trabajo de empleadas, pero SÍ
-- suma al devengado de v_cuenta_corriente y es imputable con recibos.
--
-- Pedido de Paola, 2026-09-03.
-- ============================================================

-- ── 1. Un solo saldo inicial vigente por cliente ──────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_liquidaciones_saldo_inicial_unico
  ON liquidaciones (cliente_id)
  WHERE tipo_liquidacion = 'SALDO_INICIAL' AND estado <> 'ANULADA';

-- ── 2. Alta / edición del saldo inicial ───────────────────────
-- Upsert: si el cliente ya tiene saldo inicial vigente lo actualiza, si no lo crea.
-- Solo admin. No se puede dejar por debajo de lo que ya se le cobró contra él.
CREATE OR REPLACE FUNCTION fn_guardar_saldo_inicial(
  p_cliente_id UUID,
  p_fecha      DATE,
  p_importe    NUMERIC,
  p_detalle    TEXT DEFAULT NULL
)
RETURNS liquidaciones
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_liq      liquidaciones;
  v_imputado NUMERIC(14,2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede cargar el saldo inicial';
  END IF;
  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'El importe del saldo inicial debe ser mayor a 0';
  END IF;

  SELECT * INTO v_liq
    FROM liquidaciones
   WHERE cliente_id = p_cliente_id
     AND tipo_liquidacion = 'SALDO_INICIAL'
     AND estado <> 'ANULADA'
   FOR UPDATE;

  -- Alta
  IF NOT FOUND THEN
    INSERT INTO liquidaciones (
      cliente_id, tipo_servicio, fecha_liquidacion, importe_liquidado,
      detalle, tipo_liquidacion, estado
    )
    VALUES (
      p_cliente_id, 'SALDO_INICIAL', COALESCE(p_fecha, CURRENT_DATE), p_importe,
      NULLIF(p_detalle, ''), 'SALDO_INICIAL', 'PENDIENTE'
    )
    RETURNING * INTO v_liq;
    RETURN v_liq;
  END IF;

  -- Edición
  SELECT COALESCE(SUM(i.importe), 0) INTO v_imputado
    FROM imputaciones i
    JOIN recibos r ON r.id = i.recibo_id
   WHERE i.liquidacion_id = v_liq.id
     AND r.anulado = FALSE;

  IF p_importe < v_imputado THEN
    RAISE EXCEPTION 'El saldo inicial (%) no puede ser menor a lo que ya se cobró contra él (%)',
      p_importe, v_imputado;
  END IF;

  UPDATE liquidaciones
     SET importe_liquidado = p_importe,
         fecha_liquidacion = COALESCE(p_fecha, fecha_liquidacion),
         detalle           = NULLIF(p_detalle, ''),
         updated_at        = NOW()
   WHERE id = v_liq.id;

  -- El importe cambió: PENDIENTE / PARCIALMENTE_COBRADA / COBRADA puede haber quedado viejo
  PERFORM fn_recalcular_estado_liquidacion(v_liq.id);

  SELECT * INTO v_liq FROM liquidaciones WHERE id = v_liq.id;
  RETURN v_liq;
END;
$$;
