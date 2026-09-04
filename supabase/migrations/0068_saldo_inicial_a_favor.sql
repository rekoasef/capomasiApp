-- ============================================================
-- 0068_saldo_inicial_a_favor.sql
-- Paola, 2026-09-04: el saldo con el que un cliente arranca en el sistema no
-- siempre es deuda — a veces tenía plata a favor (pagó de más o adelantado antes
-- del sistema) y hay que poder cargarlo así.
--
-- La deuda inicial ya se modela como liquidación SALDO_INICIAL (0067). El crédito
-- inicial se modela como lo que ya es en este modelo: un recibo sin imputar. Así
-- v_cuenta_corriente lo cuenta en saldo_a_favor sin tocar nada más, y después se
-- puede imputar a las facturas que vayan saliendo.
--
-- tipo_pago = 'SALDO_INICIAL' porque la plata no entra ahora: no genera movimiento
-- de fondos (mismo criterio que COMPENSACION en 0059) y no es elegible en el
-- formulario de recibo (no está en la tabla parametros).
--
-- Un cliente tiene un solo saldo inicial: o deuda o a favor. Cambiar de un lado al
-- otro se resuelve acá adentro, siempre que no se le haya imputado nada todavía.
-- ============================================================

-- ── 1. tipo_pago SALDO_INICIAL ────────────────────────────────
ALTER TABLE recibos DROP CONSTRAINT IF EXISTS recibos_tipo_pago_check;
ALTER TABLE recibos
  ADD CONSTRAINT recibos_tipo_pago_check
  CHECK (tipo_pago IN ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'USD', 'COMPENSACION', 'SALDO_INICIAL'));

-- ── 2. No genera movimiento de fondos ─────────────────────────
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
  -- COMPENSACION: trabajo por trabajo, no entra plata.
  -- SALDO_INICIAL: la plata entró antes del sistema, ya está en el saldo de caja.
  IF NEW.tipo_pago IN ('COMPENSACION', 'SALDO_INICIAL') THEN
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

-- ── 3. Un solo saldo a favor inicial por cliente ──────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_recibos_saldo_inicial_unico
  ON recibos (cliente_id)
  WHERE tipo_pago = 'SALDO_INICIAL' AND anulado = FALSE;

-- ── 4. Alta / edición del saldo inicial (deuda o a favor) ─────
-- Reemplaza la versión de 0067 (que solo contemplaba deuda).
DROP FUNCTION IF EXISTS fn_guardar_saldo_inicial(UUID, DATE, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION fn_guardar_saldo_inicial(
  p_cliente_id UUID,
  p_fecha      DATE,
  p_importe    NUMERIC,
  p_detalle    TEXT DEFAULT NULL,
  p_a_favor    BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_liq      liquidaciones;
  v_rec      recibos;
  v_imputado NUMERIC(14,2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede cargar el saldo inicial';
  END IF;
  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'El importe del saldo inicial debe ser mayor a 0';
  END IF;

  -- ── Saldo a favor: recibo sin imputar ──────────────────────
  IF p_a_favor THEN
    -- Estaba cargado como deuda: se descarta si todavía no se le cobró nada
    SELECT * INTO v_liq
      FROM liquidaciones
     WHERE cliente_id = p_cliente_id
       AND tipo_liquidacion = 'SALDO_INICIAL'
       AND estado <> 'ANULADA'
     FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM(i.importe), 0) INTO v_imputado
        FROM imputaciones i
        JOIN recibos r ON r.id = i.recibo_id
       WHERE i.liquidacion_id = v_liq.id
         AND r.anulado = FALSE;

      IF v_imputado > 0 THEN
        RAISE EXCEPTION 'El saldo inicial está cargado como deuda y ya se le imputaron cobros por %. Desimputá esos cobros antes de pasarlo a saldo a favor', v_imputado;
      END IF;

      DELETE FROM liquidaciones WHERE id = v_liq.id;
    END IF;

    SELECT * INTO v_rec
      FROM recibos
     WHERE cliente_id = p_cliente_id
       AND tipo_pago = 'SALDO_INICIAL'
       AND anulado = FALSE
     FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO recibos (cliente_id, fecha, tipo_pago, importe, notas, created_by)
      VALUES (
        p_cliente_id, COALESCE(p_fecha, CURRENT_DATE), 'SALDO_INICIAL',
        p_importe, NULLIF(p_detalle, ''), auth.uid()
      )
      RETURNING * INTO v_rec;
      v_imputado := 0;
    ELSE
      SELECT COALESCE(SUM(importe), 0) INTO v_imputado
        FROM imputaciones WHERE recibo_id = v_rec.id;

      IF p_importe < v_imputado THEN
        RAISE EXCEPTION 'El saldo a favor (%) no puede ser menor a lo que ya se imputó a facturas (%)',
          p_importe, v_imputado;
      END IF;

      UPDATE recibos
         SET importe    = p_importe,
             fecha      = COALESCE(p_fecha, fecha),
             notas      = NULLIF(p_detalle, ''),
             updated_at = NOW()
       WHERE id = v_rec.id
      RETURNING * INTO v_rec;
    END IF;

    RETURN jsonb_build_object(
      'tipo', 'FAVOR',
      'id', v_rec.id,
      'fecha', v_rec.fecha,
      'importe', v_rec.importe,
      'detalle', v_rec.notas,
      'imputado', v_imputado
    );
  END IF;

  -- ── Deuda: liquidación SALDO_INICIAL ───────────────────────
  -- Estaba cargado a favor: se descarta si todavía no se imputó a ninguna factura
  SELECT * INTO v_rec
    FROM recibos
   WHERE cliente_id = p_cliente_id
     AND tipo_pago = 'SALDO_INICIAL'
     AND anulado = FALSE
   FOR UPDATE;

  IF FOUND THEN
    SELECT COALESCE(SUM(importe), 0) INTO v_imputado
      FROM imputaciones WHERE recibo_id = v_rec.id;

    IF v_imputado > 0 THEN
      RAISE EXCEPTION 'El saldo inicial está cargado a favor del cliente y ya se imputaron % a facturas. Desimputá eso antes de pasarlo a deuda', v_imputado;
    END IF;

    DELETE FROM recibos WHERE id = v_rec.id;
  END IF;

  SELECT * INTO v_liq
    FROM liquidaciones
   WHERE cliente_id = p_cliente_id
     AND tipo_liquidacion = 'SALDO_INICIAL'
     AND estado <> 'ANULADA'
   FOR UPDATE;

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
    v_imputado := 0;
  ELSE
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

    -- El importe cambió: el estado PENDIENTE / PARCIALMENTE_COBRADA / COBRADA puede haber quedado viejo
    PERFORM fn_recalcular_estado_liquidacion(v_liq.id);

    SELECT * INTO v_liq FROM liquidaciones WHERE id = v_liq.id;
  END IF;

  RETURN jsonb_build_object(
    'tipo', 'DEUDA',
    'id', v_liq.id,
    'fecha', v_liq.fecha_liquidacion,
    'importe', v_liq.importe_liquidado,
    'detalle', v_liq.detalle,
    'imputado', v_imputado
  );
END;
$$;
