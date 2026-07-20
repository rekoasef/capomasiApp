-- ============================================================
-- 0030_importar_comision_individual.sql
-- Permite importar una comisión de producción individual
-- (un único trabajo_realizado) a la liquidación.
-- ============================================================

CREATE FUNCTION fn_importar_comision_trabajo_individual(p_trabajo_id UUID)
RETURNS TABLE (liquidacion_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trabajo  trabajos_realizados;
  v_liq_id   UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede importar comisiones';
  END IF;

  SELECT * INTO v_trabajo
  FROM trabajos_realizados
  WHERE id = p_trabajo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trabajo no encontrado';
  END IF;

  IF NOT v_trabajo.genera_comision OR v_trabajo.importe_comision IS NULL THEN
    RAISE EXCEPTION 'Este trabajo no tiene comisión';
  END IF;

  IF v_trabajo.liquidacion_empleada_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este trabajo ya fue importado a la liquidación';
  END IF;

  INSERT INTO liquidaciones_empleadas (
    empleada_id, concepto, tipo_concepto,
    periodo_mes, periodo_anio, importe, observaciones
  ) VALUES (
    v_trabajo.empleada_id,
    'Premio — ' || v_trabajo.tipo_trabajo,
    'HABER',
    v_trabajo.periodo_mes, v_trabajo.periodo_anio,
    v_trabajo.importe_comision,
    'Importado desde trabajos realizados'
  )
  RETURNING id INTO v_liq_id;

  UPDATE trabajos_realizados
  SET liquidacion_empleada_id = v_liq_id
  WHERE id = p_trabajo_id;

  RETURN QUERY SELECT v_liq_id;
END;
$$;
