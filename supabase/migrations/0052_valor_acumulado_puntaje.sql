-- ============================================================
-- 0052_valor_acumulado_puntaje.sql
-- El saldo de puntos de empleadas pasa a llevar también la plata
-- en paralelo, en vez de estimarla con un promedio recalculado
-- sobre todo el historial en cada descuento (esto último se agregó
-- en la sesión anterior y resultó insuficiente: no reflejaba lo que
-- realmente quedaba pendiente después de un descuento parcial).
--
-- Acordado con Renzo: si una empleada tiene 70 pts que valen
-- $1.000.000 y Paola descuenta 31 pts pagando $400.000, debe quedar
-- 39 pts / $600.000 — dos contadores que bajan juntos, no un
-- promedio que se recalcula cada vez.
--
-- Mecanismo: cada punto generado guarda un snapshot de su valor en
-- pesos (usando el $/punto vigente de valores_punto_tipo en el
-- momento de generarse, igual que puntos_snapshot en vencimientos
-- protege de cambios posteriores a la config). saldo_puntaje_empleadas
-- acumula ese valor en una columna nueva, y fn_ajustar_saldo_puntaje
-- ahora descuenta puntos Y plata como dos números independientes.
-- ============================================================

ALTER TABLE registros_puntaje_empleadas
  ADD COLUMN IF NOT EXISTS valor_generado NUMERIC;

ALTER TABLE saldo_puntaje_empleadas
  ADD COLUMN IF NOT EXISTS valor_acumulado NUMERIC NOT NULL DEFAULT 0;

-- ── Trigger: snapshot del valor al generar el punto ────────────

CREATE OR REPLACE FUNCTION fn_calcular_valor_generado_puntaje()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valor NUMERIC;
BEGIN
  IF NEW.tipo_trabajo IS NOT NULL THEN
    SELECT valor_por_punto INTO v_valor
    FROM valores_punto_tipo
    WHERE tipo_trabajo = NEW.tipo_trabajo
      AND vigente_desde <= CURRENT_DATE
    ORDER BY vigente_desde DESC
    LIMIT 1;
  END IF;

  NEW.valor_generado := CASE WHEN v_valor IS NOT NULL THEN NEW.puntos * v_valor ELSE NULL END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_valor_generado_puntaje ON registros_puntaje_empleadas;

CREATE TRIGGER trg_calcular_valor_generado_puntaje
  BEFORE INSERT ON registros_puntaje_empleadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_calcular_valor_generado_puntaje();

-- ── Triggers de saldo: ahora suman/restan también valor_acumulado ──
-- (mismos triggers de 0043, se reemplaza el cuerpo de las funciones;
-- no hace falta recrear trg_sync_saldo_puntaje_insert/delete)

CREATE OR REPLACE FUNCTION fn_sync_saldo_puntaje_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, valor_acumulado, updated_at)
  VALUES (NEW.empleada_id, NEW.puntos, COALESCE(NEW.valor_generado, 0), NOW())
  ON CONFLICT (empleada_id) DO UPDATE
    SET puntos_acumulados = saldo_puntaje_empleadas.puntos_acumulados + NEW.puntos,
        valor_acumulado = saldo_puntaje_empleadas.valor_acumulado + COALESCE(NEW.valor_generado, 0),
        updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_saldo_puntaje_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE saldo_puntaje_empleadas
     SET puntos_acumulados = puntos_acumulados - OLD.puntos,
         valor_acumulado = valor_acumulado - COALESCE(OLD.valor_generado, 0),
         updated_at = NOW()
   WHERE empleada_id = OLD.empleada_id;
  RETURN OLD;
END;
$$;

-- ── fn_ajustar_saldo_puntaje: descuenta puntos Y plata ─────────
-- p_monto_a_descontar es lo que Paola efectivamente decide pagar
-- (el sugerido u otro que ella tipee) — no tiene que ser proporcional
-- a los puntos descontados, es un ajuste manual como el de puntos.

CREATE OR REPLACE FUNCTION fn_ajustar_saldo_puntaje(
  p_empleada_id UUID,
  p_puntos_a_descontar NUMERIC,
  p_monto_a_descontar NUMERIC DEFAULT 0,
  p_nota TEXT DEFAULT NULL
)
RETURNS TABLE (puntos_acumulados NUMERIC, valor_acumulado NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_puntos_actual NUMERIC;
  v_valor_actual NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede ajustar el saldo de puntos';
  END IF;

  IF p_puntos_a_descontar IS NULL OR p_puntos_a_descontar <= 0 THEN
    RAISE EXCEPTION 'Los puntos a descontar deben ser mayores a 0';
  END IF;

  SELECT COALESCE(s.puntos_acumulados, 0), COALESCE(s.valor_acumulado, 0)
    INTO v_puntos_actual, v_valor_actual
  FROM saldo_puntaje_empleadas s
  WHERE s.empleada_id = p_empleada_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_puntos_actual := 0;
    v_valor_actual := 0;
  END IF;

  IF p_puntos_a_descontar > v_puntos_actual THEN
    RAISE EXCEPTION 'No se puede descontar % pts: el saldo disponible es % pts',
      p_puntos_a_descontar, v_puntos_actual;
  END IF;

  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, valor_acumulado, updated_at)
  VALUES (
    p_empleada_id,
    v_puntos_actual - p_puntos_a_descontar,
    v_valor_actual - COALESCE(p_monto_a_descontar, 0),
    NOW()
  )
  ON CONFLICT (empleada_id) DO UPDATE
    SET puntos_acumulados = v_puntos_actual - p_puntos_a_descontar,
        valor_acumulado = v_valor_actual - COALESCE(p_monto_a_descontar, 0),
        updated_at = NOW();

  INSERT INTO audit_log (usuario_id, tabla_afectada, registro_id, accion, valor_anterior, valor_nuevo)
  VALUES (
    auth.uid(),
    'saldo_puntaje_empleadas',
    p_empleada_id,
    'AJUSTE_MANUAL_PUNTOS',
    jsonb_build_object('puntos_acumulados', v_puntos_actual, 'valor_acumulado', v_valor_actual),
    jsonb_build_object(
      'puntos_acumulados', v_puntos_actual - p_puntos_a_descontar,
      'valor_acumulado', v_valor_actual - COALESCE(p_monto_a_descontar, 0),
      'puntos_descontados', p_puntos_a_descontar,
      'monto_descontado', p_monto_a_descontar,
      'nota', p_nota
    )
  );

  RETURN QUERY SELECT
    (v_puntos_actual - p_puntos_a_descontar),
    (v_valor_actual - COALESCE(p_monto_a_descontar, 0));
END;
$$;

-- ── Backfill (best-effort, datos ya existentes) ────────────────

-- 1) valor_generado por registro histórico: usa el $/punto vigente
--    HOY porque en su momento no se guardaba snapshot.
UPDATE registros_puntaje_empleadas r
SET valor_generado = r.puntos * v.valor_por_punto
FROM (
  SELECT DISTINCT ON (tipo_trabajo) tipo_trabajo, valor_por_punto
  FROM valores_punto_tipo
  WHERE vigente_desde <= CURRENT_DATE
  ORDER BY tipo_trabajo, vigente_desde DESC
) v
WHERE r.tipo_trabajo = v.tipo_trabajo
  AND r.valor_generado IS NULL;

-- 2) valor_acumulado inicial por empleada: puntos_acumulados actuales
--    (que ya reflejan descuentos previos) × promedio histórico $/punto.
--    Aproximación de arranque única vez — de acá en adelante los
--    triggers de arriba lo mantienen exacto.
WITH promedio AS (
  SELECT
    r.empleada_id,
    SUM(r.puntos * vv.valor_por_punto) AS suma_valor,
    SUM(r.puntos) AS suma_puntos_con_valor
  FROM registros_puntaje_empleadas r
  JOIN (
    SELECT DISTINCT ON (tipo_trabajo) tipo_trabajo, valor_por_punto
    FROM valores_punto_tipo
    WHERE vigente_desde <= CURRENT_DATE
    ORDER BY tipo_trabajo, vigente_desde DESC
  ) vv ON vv.tipo_trabajo = r.tipo_trabajo
  GROUP BY r.empleada_id
)
UPDATE saldo_puntaje_empleadas s
SET valor_acumulado = s.puntos_acumulados * (p.suma_valor / p.suma_puntos_con_valor)
FROM promedio p
WHERE p.empleada_id = s.empleada_id
  AND p.suma_puntos_con_valor > 0
  AND s.valor_acumulado = 0;
