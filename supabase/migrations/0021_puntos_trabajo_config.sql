-- ============================================================
-- 0021_puntos_trabajo_config.sql
-- Sistema de puntos por trabajo: configuración automática
-- de puntos al aprobar trabajos de empleadas tipo PUNTAJE
-- ============================================================

-- ── 1. Añadir tipo_trabajo a registros_puntaje_empleadas ───────
-- Permite calcular el valor monetario por tipo al liquidar.

ALTER TABLE registros_puntaje_empleadas
  ADD COLUMN IF NOT EXISTS tipo_trabajo TEXT;

-- ── 2. Permitir valor = 0 en comisiones_config ─────────────────
-- Para PUNTAJE, el valor monetario viene de pts × valor_por_tipo,
-- no de un valor fijo por empleada. Se permite 0 para ese caso.

ALTER TABLE comisiones_config
  DROP CONSTRAINT IF EXISTS comisiones_config_valor_check;
ALTER TABLE comisiones_config
  ADD CONSTRAINT comisiones_config_valor_nonneg CHECK (valor >= 0);

-- ── 3. Tabla: puntos_trabajo_config ───────────────────────────
-- Paola configura cuántos puntos vale cada tipo de trabajo
-- por cliente según complejidad.

CREATE TABLE puntos_trabajo_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_trabajo TEXT NOT NULL,
  puntos       NUMERIC(10,2) NOT NULL CHECK (puntos > 0),
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT puntos_trabajo_config_uq UNIQUE (cliente_id, tipo_trabajo)
);

CREATE INDEX idx_puntos_trabajo_config_cliente
  ON puntos_trabajo_config(cliente_id, tipo_trabajo);

ALTER TABLE puntos_trabajo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "puntos_trabajo_config_read"
  ON puntos_trabajo_config FOR SELECT
  USING (is_authenticated_user());

CREATE POLICY "puntos_trabajo_config_write"
  ON puntos_trabajo_config FOR ALL
  USING (is_admin());

-- ── 4. Tabla: valores_punto_tipo ──────────────────────────────
-- Paola define cuánto vale monetariamente cada punto según
-- el tipo de trabajo. Se puede cambiar en cada liquidación
-- sin afectar períodos anteriores.

CREATE TABLE valores_punto_tipo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_trabajo    TEXT NOT NULL,
  valor_por_punto NUMERIC(14,2) NOT NULL CHECK (valor_por_punto > 0),
  vigente_desde   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valores_punto_tipo_uq UNIQUE (tipo_trabajo, vigente_desde)
);

CREATE INDEX idx_valores_punto_tipo_trabajo
  ON valores_punto_tipo(tipo_trabajo, vigente_desde DESC);

ALTER TABLE valores_punto_tipo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valores_punto_tipo_read"
  ON valores_punto_tipo FOR SELECT
  USING (is_authenticated_user());

CREATE POLICY "valores_punto_tipo_write"
  ON valores_punto_tipo FOR ALL
  USING (is_admin());

-- ── 5. Función: aprobar trabajo (actualizada) ─────────────────
-- Mantiene comportamiento original para PRODUCCION.
-- Para PUNTAJE: busca la config de puntos y auto-inserta
-- en registros_puntaje_empleadas.

CREATE OR REPLACE FUNCTION fn_aprobar_trabajo_realizado(
  p_trabajo_id       UUID,
  p_genera_comision  BOOLEAN DEFAULT FALSE,
  p_importe_comision NUMERIC DEFAULT NULL
)
RETURNS trabajos_realizados
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trabajo        trabajos_realizados;
  v_tipo_comision  TEXT;
  v_puntos_config  NUMERIC;
  v_cliente_nombre TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede aprobar trabajos';
  END IF;

  IF p_genera_comision AND (p_importe_comision IS NULL OR p_importe_comision < 0) THEN
    RAISE EXCEPTION 'Importe de comisión inválido';
  END IF;

  UPDATE trabajos_realizados
     SET genera_comision  = p_genera_comision,
         importe_comision = CASE
           WHEN p_genera_comision THEN p_importe_comision
           ELSE NULL
         END,
         aprobado_por = auth.uid(),
         aprobado_at  = NOW(),
         updated_at   = NOW()
   WHERE id = p_trabajo_id
   RETURNING * INTO v_trabajo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trabajo no encontrado';
  END IF;

  -- Auto-generar puntos para empleadas tipo PUNTAJE
  SELECT tipo_comision INTO v_tipo_comision
  FROM empleadas
  WHERE id = v_trabajo.empleada_id;

  IF v_tipo_comision = 'PUNTAJE' AND v_trabajo.cliente_id IS NOT NULL THEN
    SELECT puntos INTO v_puntos_config
    FROM puntos_trabajo_config
    WHERE cliente_id   = v_trabajo.cliente_id
      AND tipo_trabajo = v_trabajo.tipo_trabajo
      AND activo       = TRUE;

    IF FOUND THEN
      SELECT nombre INTO v_cliente_nombre
      FROM clientes WHERE id = v_trabajo.cliente_id;

      INSERT INTO registros_puntaje_empleadas (
        empleada_id, periodo_mes, periodo_anio,
        descripcion, puntos, tipo_trabajo, created_by
      ) VALUES (
        v_trabajo.empleada_id,
        v_trabajo.periodo_mes,
        v_trabajo.periodo_anio,
        v_trabajo.tipo_trabajo || COALESCE(' — ' || v_cliente_nombre, ''),
        v_puntos_config,
        v_trabajo.tipo_trabajo,
        auth.uid()
      );
    END IF;
  END IF;

  RETURN v_trabajo;
END;
$$;

-- ── 6. Función: calcular comisión por puntaje (actualizada) ───
-- Calcula valor monetario = SUM(pts × valor_por_tipo_vigente).

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
    -- Valor monetario = SUM(pts × valor vigente por tipo)
    SELECT COALESCE(SUM(
      rpe.puntos * COALESCE((
        SELECT vpt.valor_por_punto
        FROM valores_punto_tipo vpt
        WHERE vpt.tipo_trabajo = rpe.tipo_trabajo
          AND vpt.vigente_desde <= CURRENT_DATE
        ORDER BY vpt.vigente_desde DESC
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

-- ── 7. Función: confirmar comisión por puntaje (actualizada) ──

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
        WHERE vpt.tipo_trabajo = rpe.tipo_trabajo
          AND vpt.vigente_desde <= CURRENT_DATE
        ORDER BY vpt.vigente_desde DESC
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
