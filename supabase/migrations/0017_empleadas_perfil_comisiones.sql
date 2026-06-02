-- ============================================================
-- 0017_empleadas_perfil_comisiones.sql
-- Expansión del módulo empleadas: perfil completo + comisiones
-- ============================================================

-- ── 1. Expandir tabla empleadas ────────────────────────────────

ALTER TABLE empleadas
  ADD COLUMN IF NOT EXISTS apellido         TEXT,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS dni              TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS telefono         TEXT,
  ADD COLUMN IF NOT EXISTS direccion        TEXT,
  ADD COLUMN IF NOT EXISTS localidad        TEXT,
  ADD COLUMN IF NOT EXISTS cbu              TEXT,
  ADD COLUMN IF NOT EXISTS alias_cbu        TEXT,
  ADD COLUMN IF NOT EXISTS fecha_ingreso    DATE,
  ADD COLUMN IF NOT EXISTS sueldo_fijo      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS tipo_comision    TEXT NOT NULL DEFAULT 'NINGUNA'
    CONSTRAINT empleadas_tipo_comision_chk
    CHECK (tipo_comision IN ('PRODUCCION', 'PUNTAJE', 'HORAS', 'NINGUNA'));

-- ── 2. Configuración de comisiones por empleada ────────────────
-- Una fila vigente por empleada; se versionan por vigente_desde.

CREATE TABLE comisiones_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id    UUID NOT NULL REFERENCES empleadas(id) ON DELETE CASCADE,
  tipo_calculo   TEXT NOT NULL
    CONSTRAINT comisiones_config_tipo_chk
    CHECK (tipo_calculo IN ('PORCENTAJE', 'MONTO_FIJO', 'VALOR_HORA')),
  valor          NUMERIC(14,4) NOT NULL CHECK (valor > 0),
  umbral_puntaje NUMERIC(10,2) CHECK (umbral_puntaje IS NULL OR umbral_puntaje > 0),
  vigente_desde  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comisiones_config_vigencia_uq UNIQUE (empleada_id, vigente_desde)
);

CREATE INDEX idx_comisiones_config_empleada
  ON comisiones_config(empleada_id, vigente_desde DESC);

ALTER TABLE comisiones_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comisiones_config_read"  ON comisiones_config FOR SELECT USING (is_admin());
CREATE POLICY "comisiones_config_write" ON comisiones_config FOR ALL    USING (is_admin());

-- ── 3. Registros de puntaje mensuales ──────────────────────────

CREATE TABLE registros_puntaje_empleadas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id  UUID NOT NULL REFERENCES empleadas(id) ON DELETE CASCADE,
  periodo_mes  INT  NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio INT  NOT NULL CHECK (periodo_anio >= 2020),
  descripcion  TEXT NOT NULL,
  puntos       NUMERIC(10,2) NOT NULL CHECK (puntos > 0),
  created_by   UUID REFERENCES usuarios(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registros_puntaje_emp_periodo
  ON registros_puntaje_empleadas(empleada_id, periodo_anio, periodo_mes);

ALTER TABLE registros_puntaje_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registros_puntaje_read"
  ON registros_puntaje_empleadas FOR SELECT USING (is_authenticated_user());
CREATE POLICY "registros_puntaje_write"
  ON registros_puntaje_empleadas FOR ALL USING (is_admin());

-- ── 4. Saldo acumulado de puntaje ──────────────────────────────

CREATE TABLE saldo_puntaje_empleadas (
  empleada_id       UUID PRIMARY KEY REFERENCES empleadas(id) ON DELETE CASCADE,
  puntos_acumulados NUMERIC(10,2) NOT NULL DEFAULT 0
    CHECK (puntos_acumulados >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saldo_puntaje_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saldo_puntaje_read"
  ON saldo_puntaje_empleadas FOR SELECT USING (is_authenticated_user());
CREATE POLICY "saldo_puntaje_write"
  ON saldo_puntaje_empleadas FOR ALL USING (is_admin());

-- ── 5. Registros de horas trabajadas ───────────────────────────

CREATE TABLE registros_horas_empleadas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id  UUID NOT NULL REFERENCES empleadas(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  horas        NUMERIC(5,2) NOT NULL CHECK (horas > 0 AND horas <= 24),
  descripcion  TEXT,
  periodo_mes  INT  NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio INT  NOT NULL CHECK (periodo_anio >= 2020),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registros_horas_emp_periodo
  ON registros_horas_empleadas(empleada_id, periodo_anio, periodo_mes);
CREATE INDEX idx_registros_horas_fecha
  ON registros_horas_empleadas(fecha);

ALTER TABLE registros_horas_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registros_horas_read"
  ON registros_horas_empleadas FOR SELECT USING (is_authenticated_user());
CREATE POLICY "registros_horas_write"
  ON registros_horas_empleadas FOR ALL USING (is_admin());

-- ── 6. Función: calcular comisión por producción (solo lectura) ─

CREATE OR REPLACE FUNCTION fn_calcular_comision_produccion(
  p_empleada_id  UUID,
  p_periodo_mes  INT,
  p_periodo_anio INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config         comisiones_config;
  v_total_comision NUMERIC;
  v_resultado      NUMERIC;
BEGIN
  SELECT * INTO v_config
  FROM comisiones_config
  WHERE empleada_id = p_empleada_id
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(importe_comision), 0) INTO v_total_comision
  FROM trabajos_realizados
  WHERE empleada_id  = p_empleada_id
    AND periodo_mes  = p_periodo_mes
    AND periodo_anio = p_periodo_anio
    AND aprobado_at IS NOT NULL
    AND genera_comision = TRUE;

  IF v_config.tipo_calculo = 'PORCENTAJE' THEN
    v_resultado := v_total_comision * v_config.valor / 100;
  ELSE
    v_resultado := v_config.valor;
  END IF;

  RETURN ROUND(v_resultado, 2);
END;
$$;

-- ── 7. Función: calcular comisión por horas (solo lectura) ──────

CREATE OR REPLACE FUNCTION fn_calcular_comision_horas(
  p_empleada_id  UUID,
  p_periodo_mes  INT,
  p_periodo_anio INT
)
RETURNS TABLE (
  total_horas NUMERIC,
  valor_hora  NUMERIC,
  total_pagar NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config comisiones_config;
  v_horas  NUMERIC;
BEGIN
  SELECT * INTO v_config
  FROM comisiones_config
  WHERE empleada_id = p_empleada_id
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(horas), 0) INTO v_horas
  FROM registros_horas_empleadas
  WHERE empleada_id  = p_empleada_id
    AND periodo_mes  = p_periodo_mes
    AND periodo_anio = p_periodo_anio;

  RETURN QUERY SELECT
    v_horas,
    v_config.valor,
    ROUND(v_horas * v_config.valor, 2);
END;
$$;

-- ── 8. Función: preview comisión por puntaje (solo lectura) ─────

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
BEGIN
  SELECT * INTO v_config
  FROM comisiones_config
  WHERE empleada_id = p_empleada_id
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  IF NOT FOUND OR v_config.umbral_puntaje IS NULL THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
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
    IF v_config.tipo_calculo = 'PORCENTAJE' THEN
      SELECT COALESCE(e.sueldo_fijo, 0) * v_config.valor / 100 INTO v_comision
      FROM empleadas e WHERE e.id = p_empleada_id;
    ELSE
      v_comision := v_config.valor;
    END IF;
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

-- ── 9. Función: confirmar comisión por puntaje (escribe) ────────
-- Actualiza saldo + crea entrada en liquidaciones_empleadas.

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
    IF v_config.tipo_calculo = 'PORCENTAJE' THEN
      SELECT COALESCE(e.sueldo_fijo, 0) * v_config.valor / 100 INTO v_comision
      FROM empleadas e WHERE e.id = p_empleada_id;
    ELSE
      v_comision := v_config.valor;
    END IF;
    v_restante := v_total - v_config.umbral_puntaje;

    INSERT INTO liquidaciones_empleadas (
      empleada_id, concepto, tipo_concepto, periodo_mes, periodo_anio, importe, observaciones
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

  -- Upsert del saldo acumulado
  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, updated_at)
  VALUES (p_empleada_id, v_restante, NOW())
  ON CONFLICT (empleada_id)
  DO UPDATE SET puntos_acumulados = EXCLUDED.puntos_acumulados, updated_at = NOW();

  RETURN QUERY SELECT ROUND(v_comision, 2), v_restante, v_liq_id;
END;
$$;
