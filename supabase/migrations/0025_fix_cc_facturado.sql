-- ============================================================
-- 0025_fix_cc_facturado.sql
--
-- La cuenta corriente del cliente debe usar importe_facturado
-- (lo que el cliente debe pagar, con IVA si FC_A).
-- Los ingresos/estadísticas de Paola usan importe_liquidado
-- (base sin IVA — eso es lo que ella recauda).
--
-- Cambios:
--   1) fn_recalcular_estado_liquidacion: compara contra
--      COALESCE(importe_facturado, importe_liquidado).
--   2) fn_imputar_recibo: saldo pendiente de la liquidación
--      usa COALESCE(importe_facturado, importe_liquidado).
--   3) v_cuenta_corriente:
--      - total_devengado (CC):  COALESCE(facturado, liquidado)
--      - total_devengado_neto:  importe_liquidado  ← ingresos Paola
--   4) v_ingresos_mensuales: vista para dashboard
--      (por mes: total_liquidado y total_facturado).
-- ============================================================

-- ============================================================
-- 1) fn_recalcular_estado_liquidacion
-- ============================================================
CREATE OR REPLACE FUNCTION fn_recalcular_estado_liquidacion(p_liquidacion_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_liq          liquidaciones;
  v_imputado     NUMERIC(14,2);
  v_total_liq    NUMERIC(14,2);
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

  -- Total que el cliente debe pagar: facturado si existe, sino liquidado
  v_total_liq := COALESCE(v_liq.importe_facturado, v_liq.importe_liquidado);

  IF v_imputado <= 0 THEN
    v_nuevo_estado := 'PENDIENTE';
  ELSIF v_imputado >= v_total_liq THEN
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
-- 2) fn_imputar_recibo: saldo pendiente usa importe_facturado
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
  v_total_liq      NUMERIC(14,2);
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

  -- Saldo pendiente de la liquidación (contra importe_facturado si hay)
  v_total_liq := COALESCE(v_liq.importe_facturado, v_liq.importe_liquidado);

  SELECT v_total_liq - COALESCE(SUM(i.importe), 0)
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
-- 3) v_cuenta_corriente: total_devengado = facturado al cliente
--    total_devengado_neto = base liquidado (ingresos Paola)
-- Nota: se hace DROP primero porque CREATE OR REPLACE no permite
-- insertar columnas en el medio; solo al final.
-- ============================================================
DROP VIEW IF EXISTS v_cuenta_corriente;
CREATE VIEW v_cuenta_corriente AS
WITH
totales_clientes AS (
  SELECT
    c.id     AS cliente_id,
    c.nombre AS cliente_nombre,
    -- Lo que el cliente debe pagar (con IVA si FC_A)
    COALESCE(SUM(
      COALESCE(l.importe_facturado, l.importe_liquidado)
    ) FILTER (WHERE l.estado <> 'ANULADA'), 0)         AS total_devengado,
    -- Base sin IVA: ingresos de Paola para estadísticas
    COALESCE(SUM(l.importe_liquidado)
      FILTER (WHERE l.estado <> 'ANULADA'), 0)          AS total_devengado_neto
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
  t.total_devengado_neto,
  COALESCE(ic.total_imputado, 0)  AS total_cobrado,
  COALESCE(rc.total_recibido, 0)  AS total_recibido,
  COALESCE(ic.total_imputado, 0)  AS total_imputado,
  GREATEST(0, t.total_devengado - COALESCE(ic.total_imputado, 0))  AS saldo_pendiente,
  GREATEST(0, COALESCE(rc.total_recibido, 0) - COALESCE(ic.total_imputado, 0)) AS saldo_a_favor,
  COALESCE(lp.cantidad_pendientes, 0) AS liquidaciones_pendientes
FROM totales_clientes t
LEFT JOIN recibos_clientes      rc ON rc.cliente_id = t.cliente_id
LEFT JOIN imputaciones_clientes ic ON ic.cliente_id = t.cliente_id
LEFT JOIN liqs_pendientes       lp ON lp.cliente_id = t.cliente_id;

-- ============================================================
-- 4) v_ingresos_mensuales: para el dashboard
--    total_liquidado = ingresos de Paola (base sin IVA)
--    total_facturado = lo que facturó a clientes (con IVA)
--    total_cobrado   = lo que entró en recibos ese mes
-- ============================================================
CREATE OR REPLACE VIEW v_ingresos_mensuales AS
SELECT
  DATE_TRUNC('month', l.fecha_liquidacion)::DATE         AS mes,
  COUNT(l.id)                                            AS cantidad_liquidaciones,
  COALESCE(SUM(l.importe_liquidado), 0)                  AS total_liquidado,
  COALESCE(SUM(COALESCE(l.importe_facturado, l.importe_liquidado)), 0) AS total_facturado
FROM liquidaciones l
WHERE l.estado <> 'ANULADA'
  AND l.tipo_liquidacion = 'NORMAL'
GROUP BY 1
ORDER BY 1 DESC;
