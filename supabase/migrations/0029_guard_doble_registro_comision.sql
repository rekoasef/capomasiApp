-- ============================================================
-- 0029_guard_doble_registro_comision.sql
-- Agrega guard en fn_confirmar_comision_puntaje para evitar
-- registrar la misma comisión dos veces para el mismo período.
-- ============================================================

DROP FUNCTION IF EXISTS fn_confirmar_comision_puntaje(UUID, INT, INT);

CREATE FUNCTION fn_confirmar_comision_puntaje(
  p_empleada_id  UUID,
  p_periodo_mes  INT,
  p_periodo_anio INT
)
RETURNS TABLE (
  comision_generada NUMERIC,
  puntos_restantes  NUMERIC,
  registro_id       UUID
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
  v_reg_id         UUID;
  v_monetary       NUMERIC := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede confirmar comisiones';
  END IF;

  -- Guard: evitar doble registro para el mismo período
  IF EXISTS (
    SELECT 1 FROM comisiones_puntaje_registradas
    WHERE empleada_id  = p_empleada_id
      AND periodo_mes  = p_periodo_mes
      AND periodo_anio = p_periodo_anio
  ) THEN
    RAISE EXCEPTION 'Ya existe una comisión registrada para este período';
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

  SELECT COALESCE(
    (SELECT puntos_acumulados FROM saldo_puntaje_empleadas WHERE empleada_id = p_empleada_id),
    0
  ) INTO v_puntos_acum;

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

    v_comision := ROUND(v_monetary, 2);
    v_restante := v_total - v_config.umbral_puntaje;

    INSERT INTO comisiones_puntaje_registradas (
      empleada_id, periodo_mes, periodo_anio,
      importe, puntos_total, estado,
      confirmada_by
    ) VALUES (
      p_empleada_id, p_periodo_mes, p_periodo_anio,
      v_comision, v_total, 'PENDIENTE',
      auth.uid()
    )
    RETURNING id INTO v_reg_id;
  ELSE
    v_restante := v_total;
    v_comision := 0;
  END IF;

  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, updated_at)
  VALUES (p_empleada_id, v_restante, NOW())
  ON CONFLICT (empleada_id)
  DO UPDATE SET puntos_acumulados = EXCLUDED.puntos_acumulados, updated_at = NOW();

  RETURN QUERY SELECT v_comision, v_restante, v_reg_id;
END;
$$;
