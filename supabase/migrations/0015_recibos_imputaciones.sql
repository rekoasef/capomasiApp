-- ============================================================
-- 0015_recibos_imputaciones.sql
-- Refactor del modelo de cobranzas:
--   - Antes: pagos.liquidacion_id (1 pago = 1 factura) → no soportaba saldo a favor
--   - Ahora: recibos (entrada de dinero) + imputaciones (recibo → liquidación)
--
-- Reemplaza:
--   - Tabla pagos
--   - fn_registrar_pago
--   - Trigger fn_pago_a_fondos
--   - View v_cuenta_corriente
-- ============================================================

-- ============================================================
-- 1) Limpiar el modelo viejo
-- ============================================================
DROP TRIGGER IF EXISTS trigger_pago_a_fondos ON pagos;
DROP FUNCTION IF EXISTS fn_pago_a_fondos();
DROP FUNCTION IF EXISTS fn_registrar_pago(UUID, TEXT, NUMERIC, DATE, NUMERIC, NUMERIC, TEXT, TEXT);
DROP TABLE IF EXISTS pagos CASCADE;

-- ============================================================
-- 2) recibos: dinero que ingresa, independiente de facturas
-- ============================================================
CREATE TABLE recibos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id),
  numero_recibo   TEXT,                               -- número manual opcional (X-0001)
  fecha           DATE NOT NULL,
  tipo_pago       TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE','USD')),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  importe_usd     NUMERIC(14,2),
  tipo_cambio     NUMERIC(10,4),
  cuenta_bancaria TEXT,
  cheque_id       UUID REFERENCES cheques(id),
  notas           TEXT,
  anulado         BOOLEAN NOT NULL DEFAULT FALSE,
  anulado_at      TIMESTAMPTZ,
  anulado_by      UUID REFERENCES usuarios(id),
  motivo_anulacion TEXT,
  created_by      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recibos_cliente   ON recibos(cliente_id);
CREATE INDEX idx_recibos_fecha     ON recibos(fecha);
CREATE INDEX idx_recibos_anulado   ON recibos(anulado) WHERE anulado = FALSE;
CREATE INDEX idx_recibos_cheque    ON recibos(cheque_id);

ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recibos_read"   ON recibos FOR SELECT USING (is_authenticated_user());
CREATE POLICY "recibos_insert" ON recibos FOR INSERT WITH CHECK (is_authenticated_user());
CREATE POLICY "recibos_update" ON recibos FOR UPDATE USING (is_admin());
CREATE POLICY "recibos_delete" ON recibos FOR DELETE USING (is_admin());

CREATE TRIGGER audit_recibos
  AFTER INSERT OR UPDATE OR DELETE ON recibos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================
-- 3) imputaciones: cómo se aplica un recibo a una liquidación
-- ============================================================
CREATE TABLE imputaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id       UUID NOT NULL REFERENCES recibos(id) ON DELETE CASCADE,
  liquidacion_id  UUID NOT NULL REFERENCES liquidaciones(id),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  notas           TEXT,
  created_by      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imputaciones_recibo      ON imputaciones(recibo_id);
CREATE INDEX idx_imputaciones_liquidacion ON imputaciones(liquidacion_id);

ALTER TABLE imputaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imputaciones_read"   ON imputaciones FOR SELECT USING (is_authenticated_user());
CREATE POLICY "imputaciones_insert" ON imputaciones FOR INSERT WITH CHECK (is_authenticated_user());
CREATE POLICY "imputaciones_delete" ON imputaciones FOR DELETE USING (is_admin());

CREATE TRIGGER audit_imputaciones
  AFTER INSERT OR UPDATE OR DELETE ON imputaciones
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================
-- 4) Helpers de cálculo
-- ============================================================
CREATE OR REPLACE FUNCTION fn_recalcular_estado_liquidacion(p_liquidacion_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_liq          liquidaciones;
  v_imputado     NUMERIC(14,2);
  v_nuevo_estado TEXT;
BEGIN
  SELECT * INTO v_liq FROM liquidaciones WHERE id = p_liquidacion_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_liq.estado = 'ANULADA' THEN
    RETURN 'ANULADA';
  END IF;

  SELECT COALESCE(SUM(i.importe), 0) INTO v_imputado
  FROM imputaciones i
  JOIN recibos r ON r.id = i.recibo_id
  WHERE i.liquidacion_id = p_liquidacion_id
    AND r.anulado = FALSE;

  IF v_imputado <= 0 THEN
    v_nuevo_estado := 'PENDIENTE';
  ELSIF v_imputado >= v_liq.importe_liquidado THEN
    v_nuevo_estado := 'COBRADA';
  ELSE
    v_nuevo_estado := 'PARCIALMENTE_COBRADA';
  END IF;

  UPDATE liquidaciones
     SET estado = v_nuevo_estado, updated_at = NOW()
   WHERE id = p_liquidacion_id;

  RETURN v_nuevo_estado;
END;
$$;

-- ============================================================
-- 5) RPC: registrar recibo (con imputaciones opcionales)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_registrar_recibo(
  p_cliente_id      UUID,
  p_fecha           DATE,
  p_tipo_pago       TEXT,
  p_importe         NUMERIC,
  p_imputaciones    JSONB    DEFAULT '[]'::jsonb,    -- [{ liquidacion_id, importe }, ...]
  p_numero_recibo   TEXT     DEFAULT NULL,
  p_importe_usd     NUMERIC  DEFAULT NULL,
  p_tipo_cambio     NUMERIC  DEFAULT NULL,
  p_cuenta_bancaria TEXT     DEFAULT NULL,
  p_cheque_id       UUID     DEFAULT NULL,
  p_notas           TEXT     DEFAULT NULL
)
RETURNS recibos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo            recibos;
  v_imp               JSONB;
  v_total_imputaciones NUMERIC(14,2) := 0;
  v_imp_importe       NUMERIC(14,2);
  v_liquidacion_id    UUID;
  v_liq               liquidaciones;
BEGIN
  -- Validar pre-imputaciones (si hay)
  IF jsonb_array_length(p_imputaciones) > 0 THEN
    FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones) LOOP
      v_imp_importe := (v_imp->>'importe')::NUMERIC;
      IF v_imp_importe IS NULL OR v_imp_importe <= 0 THEN
        RAISE EXCEPTION 'Importe de imputación inválido';
      END IF;
      v_total_imputaciones := v_total_imputaciones + v_imp_importe;
    END LOOP;

    IF v_total_imputaciones > p_importe THEN
      RAISE EXCEPTION 'Las imputaciones (%) superan el importe del recibo (%)',
        v_total_imputaciones, p_importe;
    END IF;
  END IF;

  -- Insertar recibo
  INSERT INTO recibos (
    cliente_id, numero_recibo, fecha, tipo_pago, importe,
    importe_usd, tipo_cambio, cuenta_bancaria, cheque_id, notas, created_by
  ) VALUES (
    p_cliente_id, p_numero_recibo, p_fecha, p_tipo_pago, p_importe,
    p_importe_usd, p_tipo_cambio, p_cuenta_bancaria, p_cheque_id, p_notas, auth.uid()
  )
  RETURNING * INTO v_recibo;

  -- Procesar imputaciones (si hay)
  IF jsonb_array_length(p_imputaciones) > 0 THEN
    FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones) LOOP
      v_liquidacion_id := (v_imp->>'liquidacion_id')::UUID;
      v_imp_importe    := (v_imp->>'importe')::NUMERIC;

      SELECT * INTO v_liq FROM liquidaciones WHERE id = v_liquidacion_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Liquidación % no encontrada', v_liquidacion_id;
      END IF;
      IF v_liq.estado = 'ANULADA' THEN
        RAISE EXCEPTION 'No se puede imputar a una liquidación anulada';
      END IF;
      IF v_liq.cliente_id <> p_cliente_id THEN
        RAISE EXCEPTION 'La liquidación no pertenece al cliente del recibo';
      END IF;

      INSERT INTO imputaciones (recibo_id, liquidacion_id, importe, created_by)
      VALUES (v_recibo.id, v_liquidacion_id, v_imp_importe, auth.uid());

      PERFORM fn_recalcular_estado_liquidacion(v_liquidacion_id);
    END LOOP;
  END IF;

  RETURN v_recibo;
END;
$$;

-- ============================================================
-- 6) RPC: imputar un recibo existente a una liquidación
-- ============================================================
CREATE OR REPLACE FUNCTION fn_imputar_recibo(
  p_recibo_id      UUID,
  p_liquidacion_id UUID,
  p_importe        NUMERIC,
  p_notas          TEXT DEFAULT NULL
)
RETURNS imputaciones
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo         recibos;
  v_liq            liquidaciones;
  v_ya_imputado    NUMERIC(14,2);
  v_libre_recibo   NUMERIC(14,2);
  v_pendiente_liq  NUMERIC(14,2);
  v_imp            imputaciones;
BEGIN
  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'Importe inválido';
  END IF;

  SELECT * INTO v_recibo FROM recibos WHERE id = p_recibo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recibo no encontrado';
  END IF;
  IF v_recibo.anulado THEN
    RAISE EXCEPTION 'No se puede imputar un recibo anulado';
  END IF;

  SELECT * INTO v_liq FROM liquidaciones WHERE id = p_liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Liquidación no encontrada';
  END IF;
  IF v_liq.estado = 'ANULADA' THEN
    RAISE EXCEPTION 'No se puede imputar a una liquidación anulada';
  END IF;
  IF v_liq.cliente_id <> v_recibo.cliente_id THEN
    RAISE EXCEPTION 'La liquidación no pertenece al cliente del recibo';
  END IF;

  -- Saldo libre del recibo
  SELECT COALESCE(SUM(importe), 0) INTO v_ya_imputado
    FROM imputaciones WHERE recibo_id = p_recibo_id;
  v_libre_recibo := v_recibo.importe - v_ya_imputado;

  IF p_importe > v_libre_recibo THEN
    RAISE EXCEPTION 'El importe a imputar (%) supera el saldo libre del recibo (%)',
      p_importe, v_libre_recibo;
  END IF;

  -- Saldo pendiente de la liquidación
  SELECT v_liq.importe_liquidado - COALESCE(SUM(i.importe), 0)
    INTO v_pendiente_liq
    FROM imputaciones i
    JOIN recibos r ON r.id = i.recibo_id
   WHERE i.liquidacion_id = p_liquidacion_id
     AND r.anulado = FALSE;

  IF p_importe > v_pendiente_liq THEN
    RAISE EXCEPTION 'El importe a imputar (%) supera el saldo pendiente de la liquidación (%)',
      p_importe, v_pendiente_liq;
  END IF;

  INSERT INTO imputaciones (recibo_id, liquidacion_id, importe, notas, created_by)
  VALUES (p_recibo_id, p_liquidacion_id, p_importe, p_notas, auth.uid())
  RETURNING * INTO v_imp;

  PERFORM fn_recalcular_estado_liquidacion(p_liquidacion_id);

  RETURN v_imp;
END;
$$;

-- ============================================================
-- 7) RPC: eliminar una imputación (recalcula estado)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_eliminar_imputacion(p_imputacion_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_liquidacion_id UUID;
BEGIN
  SELECT liquidacion_id INTO v_liquidacion_id
    FROM imputaciones WHERE id = p_imputacion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imputación no encontrada';
  END IF;

  DELETE FROM imputaciones WHERE id = p_imputacion_id;
  PERFORM fn_recalcular_estado_liquidacion(v_liquidacion_id);

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 8) RPC: anular un recibo (revierte imputaciones + mov fondos)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_anular_recibo(
  p_recibo_id UUID,
  p_motivo    TEXT DEFAULT NULL
)
RETURNS recibos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo recibos;
  v_liq_ids UUID[];
  v_liq_id  UUID;
BEGIN
  SELECT * INTO v_recibo FROM recibos WHERE id = p_recibo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recibo no encontrado';
  END IF;
  IF v_recibo.anulado THEN
    RAISE EXCEPTION 'El recibo ya está anulado';
  END IF;

  -- Capturar liquidaciones afectadas antes del delete
  SELECT ARRAY_AGG(DISTINCT liquidacion_id) INTO v_liq_ids
    FROM imputaciones WHERE recibo_id = p_recibo_id;

  -- Borrar imputaciones
  DELETE FROM imputaciones WHERE recibo_id = p_recibo_id;

  -- Borrar movimiento de fondos asociado
  DELETE FROM fondos_movimientos
   WHERE referencia_tipo = 'recibo' AND referencia_id = p_recibo_id;

  -- Marcar recibo como anulado
  UPDATE recibos
     SET anulado = TRUE,
         anulado_at = NOW(),
         anulado_by = auth.uid(),
         motivo_anulacion = p_motivo,
         updated_at = NOW()
   WHERE id = p_recibo_id
   RETURNING * INTO v_recibo;

  -- Recalcular estado de las liquidaciones afectadas
  IF v_liq_ids IS NOT NULL THEN
    FOREACH v_liq_id IN ARRAY v_liq_ids LOOP
      PERFORM fn_recalcular_estado_liquidacion(v_liq_id);
    END LOOP;
  END IF;

  RETURN v_recibo;
END;
$$;

-- ============================================================
-- 9) Trigger: al registrar un recibo, generar mov de fondos
-- ============================================================
CREATE OR REPLACE FUNCTION fn_recibo_a_fondos()
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
  SELECT nombre INTO v_nombre_cliente FROM clientes WHERE id = NEW.cliente_id;

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
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo, importe_usd,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'INGRESO',
    NEW.fecha,
    'Recibo cliente: ' || COALESCE(v_nombre_cliente, ''),
    v_importe_banco, v_importe_efect, v_importe_usd,
    NEW.cheque_id, 'recibo', NEW.id, NEW.created_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_recibo_a_fondos
  AFTER INSERT ON recibos
  FOR EACH ROW
  EXECUTE FUNCTION fn_recibo_a_fondos();

-- ============================================================
-- 10) View: cuenta corriente por cliente (con saldo a favor)
-- ============================================================
CREATE OR REPLACE VIEW v_cuenta_corriente AS
WITH
totales_clientes AS (
  SELECT
    c.id     AS cliente_id,
    c.nombre AS cliente_nombre,
    COALESCE(SUM(l.importe_liquidado) FILTER (WHERE l.estado <> 'ANULADA'), 0) AS total_devengado
  FROM clientes c
  LEFT JOIN liquidaciones l ON l.cliente_id = c.id
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.nombre
),
recibos_clientes AS (
  SELECT cliente_id, COALESCE(SUM(importe), 0) AS total_recibido
  FROM recibos
  WHERE anulado = FALSE
  GROUP BY cliente_id
),
imputaciones_clientes AS (
  SELECT r.cliente_id, COALESCE(SUM(i.importe), 0) AS total_imputado
  FROM imputaciones i
  JOIN recibos r ON r.id = i.recibo_id
  WHERE r.anulado = FALSE
  GROUP BY r.cliente_id
),
liqs_pendientes AS (
  SELECT cliente_id, COUNT(*) AS cantidad_pendientes
  FROM liquidaciones
  WHERE estado IN ('PENDIENTE','PARCIALMENTE_COBRADA')
  GROUP BY cliente_id
)
SELECT
  t.cliente_id,
  t.cliente_nombre,
  t.total_devengado,
  COALESCE(ic.total_imputado, 0)  AS total_cobrado,        -- compat con código existente
  COALESCE(rc.total_recibido, 0)  AS total_recibido,
  COALESCE(ic.total_imputado, 0)  AS total_imputado,
  GREATEST(0, t.total_devengado - COALESCE(ic.total_imputado, 0)) AS saldo_pendiente,
  GREATEST(0, COALESCE(rc.total_recibido, 0) - COALESCE(ic.total_imputado, 0)) AS saldo_a_favor,
  COALESCE(lp.cantidad_pendientes, 0) AS liquidaciones_pendientes
FROM totales_clientes t
LEFT JOIN recibos_clientes      rc ON rc.cliente_id = t.cliente_id
LEFT JOIN imputaciones_clientes ic ON ic.cliente_id = t.cliente_id
LEFT JOIN liqs_pendientes       lp ON lp.cliente_id = t.cliente_id;

-- ============================================================
-- 11) View: recibos con saldo libre (para imputar)
-- ============================================================
CREATE OR REPLACE VIEW v_recibos_disponibles AS
SELECT
  r.id,
  r.cliente_id,
  r.numero_recibo,
  r.fecha,
  r.tipo_pago,
  r.importe,
  r.importe_usd,
  r.tipo_cambio,
  r.cuenta_bancaria,
  r.cheque_id,
  r.notas,
  r.anulado,
  r.created_at,
  COALESCE(SUM(i.importe), 0)              AS total_imputado,
  r.importe - COALESCE(SUM(i.importe), 0)  AS saldo_libre
FROM recibos r
LEFT JOIN imputaciones i ON i.recibo_id = r.id
WHERE r.anulado = FALSE
GROUP BY r.id;

-- ============================================================
-- 12) View: imputaciones con info de liquidación y recibo
-- ============================================================
CREATE OR REPLACE VIEW v_imputaciones_detalle AS
SELECT
  i.id,
  i.recibo_id,
  i.liquidacion_id,
  i.importe,
  i.notas,
  i.created_at,
  r.cliente_id,
  r.fecha             AS recibo_fecha,
  r.tipo_pago         AS recibo_tipo_pago,
  r.numero_recibo,
  l.fecha_liquidacion,
  l.tipo_servicio,
  l.detalle           AS liquidacion_detalle,
  l.importe_liquidado
FROM imputaciones i
JOIN recibos r       ON r.id = i.recibo_id
JOIN liquidaciones l ON l.id = i.liquidacion_id
WHERE r.anulado = FALSE;
