-- ============================================================
-- 0026_fix_comision_puntaje.sql
-- Corrige el cálculo de comisión por puntaje cuando los registros
-- tienen tipo_trabajo NULL (entrada manual sin tipo especificado).
-- Fallback: usa el valor más reciente de valores_punto_tipo
-- independientemente del tipo cuando tipo_trabajo es NULL.
-- ============================================================

-- ── 1. fn_calcular_comision_puntaje (preview) ─────────────────

CREATE OR REPLACE FUNCTION fn_calcular_comision_puntaje(
  p_empleada_id  UUID,
  p_periodo_mes  INT,
  p_periodo_anio INT
)
RETURNS TABLE (
  puntos_periodo         NUMERIC,
  puntos_acumulados_prev NUMERIC,
  puntos_total           NUMERIC,
  umbral                 NUMERIC,
  comision_generada      NUMERIC,
  puntos_restantes       NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config         comisiones_config;
  v_puntos_acum    NUMERIC := 0;
  v_puntos_periodo NUMERIC;
  v_total          NUMERIC;
  v_comision       NUMERIC := 0;
  v_restante       NUMERIC;
  v_monetary       NUMERIC := 0;
BEGIN
  SELECT * INTO v_config
  FROM comisiones_config
  WHERE empleada_id = p_empleada_id
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  IF NOT FOUND OR v_config.umbral_puntaje IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(puntos), 0) INTO v_puntos_periodo
  FROM registros_puntaje_empleadas
  WHERE empleada_id  = p_empleada_id
    AND periodo_mes  = p_periodo_mes
    AND periodo_anio = p_periodo_anio;

  SELECT COALESCE(puntos_acumulados, 0) INTO v_puntos_acum
  FROM saldo_puntaje_empleadas
  WHERE empleada_id = p_empleada_id;

  v_total := v_puntos_periodo + v_puntos_acum;

  IF v_total >= v_config.umbral_puntaje THEN
    -- Valor monetario = SUM(pts × valor vigente por tipo).
    -- Cuando tipo_trabajo IS NULL (entrada manual) se usa el valor
    -- más reciente de cualquier tipo como fallback.
    SELECT COALESCE(SUM(
      rpe.puntos * COALESCE((
        SELECT vpt.valor_por_punto
        FROM valores_punto_tipo vpt
        WHERE (rpe.tipo_trabajo IS NULL OR vpt.tipo_trabajo = rpe.tipo_trabajo)
          AND vpt.vigente_desde <= CURRENT_DATE
        ORDER BY
          CASE WHEN vpt.tipo_trabajo = rpe.tipo_trabajo THEN 0 ELSE 1 END,
          vpt.vigente_desde DESC
        LIMIT 1
      ), 0)
    ), 0) INTO v_monetary
    FROM registros_puntaje_empleadas rpe
    WHERE rpe.empleada_id  = p_empleada_id
      AND rpe.periodo_mes  = p_periodo_mes
      AND rpe.periodo_anio = p_periodo_anio;

    v_comision := v_monetary;
    v_restante := v_total - v_config.umbral_puntaje;
  ELSE
    v_restante := v_total;
  END IF;

  RETURN QUERY SELECT
    v_puntos_periodo,
    v_puntos_acum,
    v_total,
    v_config.umbral_puntaje,
    ROUND(v_comision, 2),
    v_restante;
END;
$$;

-- ── 2. fn_confirmar_comision_puntaje ─────────────────────────

CREATE OR REPLACE FUNCTION fn_confirmar_comision_puntaje(
  p_empleada_id  UUID,
  p_periodo_mes  INT,
  p_periodo_anio INT
)
RETURNS TABLE (
  comision_generada NUMERIC,
  puntos_restantes  NUMERIC,
  liquidacion_id    UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config         comisiones_config;
  v_puntos_acum    NUMERIC := 0;
  v_puntos_periodo NUMERIC;
  v_total          NUMERIC;
  v_comision       NUMERIC := 0;
  v_restante       NUMERIC;
  v_liq_id         UUID;
  v_monetary       NUMERIC := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede confirmar comisiones';
  END IF;

  SELECT * INTO v_config
  FROM comisiones_config
  WHERE empleada_id = p_empleada_id
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  IF NOT FOUND OR v_config.umbral_puntaje IS NULL THEN
    RAISE EXCEPTION 'No hay configuración de puntaje activa para esta empleada';
  END IF;

  SELECT COALESCE(SUM(puntos), 0) INTO v_puntos_periodo
  FROM registros_puntaje_empleadas
  WHERE empleada_id  = p_empleada_id
    AND periodo_mes  = p_periodo_mes
    AND periodo_anio = p_periodo_anio;

  SELECT COALESCE(puntos_acumulados, 0) INTO v_puntos_acum
  FROM saldo_puntaje_empleadas
  WHERE empleada_id = p_empleada_id;

  v_total := v_puntos_periodo + v_puntos_acum;

  IF v_total >= v_config.umbral_puntaje THEN
    SELECT COALESCE(SUM(
      rpe.puntos * COALESCE((
        SELECT vpt.valor_por_punto
        FROM valores_punto_tipo vpt
        WHERE (rpe.tipo_trabajo IS NULL OR vpt.tipo_trabajo = rpe.tipo_trabajo)
          AND vpt.vigente_desde <= CURRENT_DATE
        ORDER BY
          CASE WHEN vpt.tipo_trabajo = rpe.tipo_trabajo THEN 0 ELSE 1 END,
          vpt.vigente_desde DESC
        LIMIT 1
      ), 0)
    ), 0) INTO v_monetary
    FROM registros_puntaje_empleadas rpe
    WHERE rpe.empleada_id  = p_empleada_id
      AND rpe.periodo_mes  = p_periodo_mes
      AND rpe.periodo_anio = p_periodo_anio;

    v_comision := v_monetary;
    v_restante := v_total - v_config.umbral_puntaje;

    INSERT INTO liquidaciones_empleadas (
      empleada_id, concepto, tipo_concepto,
      periodo_mes, periodo_anio, importe, observaciones
    ) VALUES (
      p_empleada_id,
      'Comisión por objetivos',
      'HABER',
      p_periodo_mes,
      p_periodo_anio,
      ROUND(v_comision, 2),
      'Generada automáticamente por sistema de puntaje'
    )
    RETURNING id INTO v_liq_id;
  ELSE
    v_restante := v_total;
    v_comision := 0;
  END IF;

  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, updated_at)
  VALUES (p_empleada_id, v_restante, NOW())
  ON CONFLICT (empleada_id)
  DO UPDATE SET
    puntos_acumulados = EXCLUDED.puntos_acumulados,
    updated_at        = NOW();

  RETURN QUERY SELECT ROUND(v_comision, 2), v_restante, v_liq_id;
END;
$$;
