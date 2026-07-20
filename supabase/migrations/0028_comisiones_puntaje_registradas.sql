-- ============================================================
-- 0028_comisiones_puntaje_registradas.sql
-- Nueva tabla para guardar comisiones pendientes de liquidar.
-- Desacopla el registro de la comisión (cuando se supera el
-- umbral) del momento en que se importa a la liquidación.
-- ============================================================

CREATE TABLE IF NOT EXISTS comisiones_puntaje_registradas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id      UUID        NOT NULL REFERENCES empleadas(id) ON DELETE CASCADE,
  periodo_mes      INT         NOT NULL,
  periodo_anio     INT         NOT NULL,
  importe          NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  puntos_total     NUMERIC(10,2) NOT NULL,
  estado           TEXT        NOT NULL DEFAULT 'PENDIENTE'
                               CHECK (estado IN ('PENDIENTE', 'LIQUIDADA')),
  liquidacion_id   UUID        REFERENCES liquidaciones_empleadas(id),
  confirmada_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmada_by    UUID        REFERENCES usuarios(id),
  liquidada_at     TIMESTAMPTZ,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comisiones_puntaje_registradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_comisiones_registradas"
  ON comisiones_puntaje_registradas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin_all_comisiones_registradas"
  ON comisiones_puntaje_registradas FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── Reemplaza fn_confirmar_comision_puntaje ───────────────────
-- Ahora guarda en comisiones_puntaje_registradas (PENDIENTE)
-- en lugar de insertar directamente en liquidaciones_empleadas.

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

-- ── Nueva función: importar comisión pendiente a liquidación ──

CREATE FUNCTION fn_liquidar_comision_puntaje(p_registro_id UUID)
RETURNS TABLE (liquidacion_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg    comisiones_puntaje_registradas;
  v_liq_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede liquidar comisiones';
  END IF;

  SELECT * INTO v_reg
  FROM comisiones_puntaje_registradas
  WHERE id = p_registro_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comisión no encontrada';
  END IF;

  IF v_reg.estado <> 'PENDIENTE' THEN
    RAISE EXCEPTION 'Esta comisión ya fue liquidada';
  END IF;

  INSERT INTO liquidaciones_empleadas (
    empleada_id, concepto, tipo_concepto,
    periodo_mes, periodo_anio, importe, observaciones
  ) VALUES (
    v_reg.empleada_id,
    'Comisión por objetivos — ' || LPAD(v_reg.periodo_mes::TEXT, 2, '0') || '/' || v_reg.periodo_anio,
    'HABER',
    v_reg.periodo_mes, v_reg.periodo_anio,
    v_reg.importe,
    'Generada automáticamente por sistema de puntaje'
  )
  RETURNING id INTO v_liq_id;

  UPDATE comisiones_puntaje_registradas
  SET estado        = 'LIQUIDADA',
      liquidacion_id = v_liq_id,
      liquidada_at   = NOW()
  WHERE id = p_registro_id;

  RETURN QUERY SELECT v_liq_id;
END;
$$;
