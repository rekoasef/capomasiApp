-- ============================================================
-- 0016_trabajos_realizados.sql
-- Planilla mensual de trabajos de empleadas + comisiones
-- ============================================================

CREATE TABLE trabajos_realizados (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id            UUID NOT NULL REFERENCES empleadas(id) ON DELETE CASCADE,
  fecha                  DATE NOT NULL,
  cliente_id             UUID REFERENCES clientes(id),
  tipo_trabajo           TEXT NOT NULL,
  descripcion            TEXT NOT NULL,
  genera_comision        BOOLEAN NOT NULL DEFAULT FALSE,
  importe_comision       NUMERIC(14,2),
  periodo_mes            INT NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio           INT NOT NULL CHECK (periodo_anio BETWEEN 2020 AND 2100),
  aprobado_por           UUID REFERENCES usuarios(id),
  aprobado_at            TIMESTAMPTZ,
  liquidacion_empleada_id UUID REFERENCES liquidaciones_empleadas(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trabajos_realizados_comision_chk
    CHECK (
      (genera_comision = FALSE AND importe_comision IS NULL)
      OR (genera_comision = TRUE AND importe_comision IS NOT NULL AND importe_comision >= 0)
    )
);

CREATE INDEX idx_trabajos_realizados_empleada
  ON trabajos_realizados(empleada_id, periodo_anio, periodo_mes);
CREATE INDEX idx_trabajos_realizados_periodo
  ON trabajos_realizados(periodo_anio, periodo_mes, fecha DESC);
CREATE INDEX idx_trabajos_realizados_cliente
  ON trabajos_realizados(cliente_id);
CREATE INDEX idx_trabajos_realizados_aprobacion
  ON trabajos_realizados(aprobado_at)
  WHERE aprobado_at IS NOT NULL;
CREATE INDEX idx_trabajos_realizados_liq_emp
  ON trabajos_realizados(liquidacion_empleada_id)
  WHERE liquidacion_empleada_id IS NOT NULL;

CREATE TRIGGER trg_trabajos_realizados_updated_at
  BEFORE UPDATE ON trabajos_realizados
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER audit_trabajos_realizados
  AFTER INSERT OR UPDATE OR DELETE ON trabajos_realizados
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

ALTER TABLE trabajos_realizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trabajos_realizados_read"
  ON trabajos_realizados
  FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM empleadas e
      WHERE e.id = trabajos_realizados.empleada_id
        AND e.usuario_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "trabajos_realizados_insert"
  ON trabajos_realizados
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM empleadas e
      WHERE e.id = trabajos_realizados.empleada_id
        AND e.usuario_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "trabajos_realizados_update_admin"
  ON trabajos_realizados
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "trabajos_realizados_delete_admin"
  ON trabajos_realizados
  FOR DELETE
  USING (is_admin());

CREATE OR REPLACE FUNCTION fn_aprobar_trabajo_realizado(
  p_trabajo_id         UUID,
  p_genera_comision    BOOLEAN,
  p_importe_comision   NUMERIC DEFAULT NULL
)
RETURNS trabajos_realizados
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trabajo trabajos_realizados;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede aprobar trabajos';
  END IF;

  IF p_genera_comision AND (p_importe_comision IS NULL OR p_importe_comision < 0) THEN
    RAISE EXCEPTION 'Importe de comisión inválido';
  END IF;

  UPDATE trabajos_realizados
     SET genera_comision = p_genera_comision,
         importe_comision = CASE
           WHEN p_genera_comision THEN p_importe_comision
           ELSE NULL
         END,
         aprobado_por = auth.uid(),
         aprobado_at = NOW(),
         updated_at = NOW()
   WHERE id = p_trabajo_id
   RETURNING * INTO v_trabajo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trabajo no encontrado';
  END IF;

  RETURN v_trabajo;
END;
$$;

CREATE OR REPLACE FUNCTION fn_importar_comisiones_trabajos(
  p_empleada_id   UUID,
  p_periodo_mes   INT,
  p_periodo_anio  INT
)
RETURNS SETOF liquidaciones_empleadas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trabajo trabajos_realizados;
  v_item    liquidaciones_empleadas;
  v_cliente_nombre TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede importar comisiones';
  END IF;

  FOR v_trabajo IN
    SELECT *
    FROM trabajos_realizados
    WHERE empleada_id = p_empleada_id
      AND periodo_mes = p_periodo_mes
      AND periodo_anio = p_periodo_anio
      AND aprobado_at IS NOT NULL
      AND genera_comision = TRUE
      AND COALESCE(importe_comision, 0) > 0
      AND liquidacion_empleada_id IS NULL
    ORDER BY fecha, created_at
  LOOP
    SELECT nombre INTO v_cliente_nombre
    FROM clientes
    WHERE id = v_trabajo.cliente_id;

    INSERT INTO liquidaciones_empleadas (
      empleada_id,
      concepto,
      tipo_concepto,
      periodo_mes,
      periodo_anio,
      importe,
      observaciones
    ) VALUES (
      v_trabajo.empleada_id,
      'Premio',
      'HABER',
      p_periodo_mes,
      p_periodo_anio,
      v_trabajo.importe_comision,
      TRIM(BOTH ' ' FROM CONCAT(
        v_trabajo.tipo_trabajo,
        CASE
          WHEN v_cliente_nombre IS NOT NULL THEN ' - ' || v_cliente_nombre
          ELSE ''
        END,
        CASE
          WHEN v_trabajo.descripcion IS NOT NULL AND v_trabajo.descripcion <> '' THEN ': ' || v_trabajo.descripcion
          ELSE ''
        END
      ))
    )
    RETURNING * INTO v_item;

    UPDATE trabajos_realizados
       SET liquidacion_empleada_id = v_item.id,
           updated_at = NOW()
     WHERE id = v_trabajo.id;

    RETURN NEXT v_item;
  END LOOP;

  RETURN;
END;
$$;
