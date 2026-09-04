-- ============================================================
-- 0071_honorario_cada_cambio_su_fila.sql
-- Paola, 2026-09-04: "cada modificación tiene que ser un dato diferente en el
-- historial".
--
-- 0069 corregía en el lugar la fila vigente cuando se había cargado ese mismo día,
-- para no dejar dos filas del mismo día. No es lo que ella quiere: el historial
-- tiene que mostrar todos los cambios, incluidos dos del mismo día. Se saca esa
-- excepción — toda edición manual cierra la fila vigente y abre una nueva.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_editar_honorario_manual(
  p_cliente_id       UUID,
  p_monto            NUMERIC,
  p_observacion      TEXT,
  p_frecuencia_meses INT DEFAULT NULL
)
RETURNS honorarios_mensuales
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual     honorarios_mensuales;
  v_nuevo      honorarios_mensuales;
  v_frecuencia INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede modificar honorarios';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto del honorario debe ser mayor a 0';
  END IF;
  IF COALESCE(TRIM(p_observacion), '') = '' THEN
    RAISE EXCEPTION 'La observación es obligatoria: es lo que explica por qué cambió el honorario';
  END IF;

  SELECT * INTO v_actual
  FROM honorarios_mensuales
  WHERE cliente_id = p_cliente_id AND vigente_hasta IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay honorario activo para el cliente';
  END IF;

  v_frecuencia := COALESCE(p_frecuencia_meses, v_actual.frecuencia_ajuste_meses);

  IF v_actual.monto = p_monto AND v_actual.frecuencia_ajuste_meses = v_frecuencia THEN
    RAISE EXCEPTION 'El honorario ya vale % con ajuste cada % meses: no hay nada que modificar',
      p_monto, v_frecuencia;
  END IF;

  UPDATE honorarios_mensuales
     SET vigente_hasta = CURRENT_DATE
   WHERE id = v_actual.id;

  INSERT INTO honorarios_mensuales (
    cliente_id, monto, frecuencia_ajuste_meses,
    vigente_desde, porcentaje_ajuste, notas, origen, creado_por
  ) VALUES (
    p_cliente_id,
    p_monto,
    v_frecuencia,
    CURRENT_DATE,
    NULL,
    TRIM(p_observacion),
    'MANUAL',
    auth.uid()
  )
  RETURNING * INTO v_nuevo;

  RETURN v_nuevo;
END;
$$;
