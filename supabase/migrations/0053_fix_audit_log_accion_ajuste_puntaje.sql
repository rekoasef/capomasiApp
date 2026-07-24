-- ============================================================
-- 0053_fix_audit_log_accion_ajuste_puntaje.sql
-- fn_ajustar_saldo_puntaje (desde 0043) insertaba accion =
-- 'AJUSTE_MANUAL_PUNTOS' en audit_log, pero audit_log_accion_check
-- solo permite 'INSERT' | 'UPDATE' | 'DELETE'. Nunca se había
-- probado el flujo real de "Descontar puntos" hasta ahora, por eso
-- no se había detectado. El detalle del ajuste (puntos/monto
-- descontados, nota) ya viaja en valor_nuevo, así que alcanza con
-- usar 'UPDATE' como acción.
-- ============================================================

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
    'UPDATE',
    jsonb_build_object('puntos_acumulados', v_puntos_actual, 'valor_acumulado', v_valor_actual),
    jsonb_build_object(
      'puntos_acumulados', v_puntos_actual - p_puntos_a_descontar,
      'valor_acumulado', v_valor_actual - COALESCE(p_monto_a_descontar, 0),
      'puntos_descontados', p_puntos_a_descontar,
      'monto_descontado', p_monto_a_descontar,
      'nota', p_nota,
      'motivo', 'AJUSTE_MANUAL_PUNTOS'
    )
  );

  RETURN QUERY SELECT
    (v_puntos_actual - p_puntos_a_descontar),
    (v_valor_actual - COALESCE(p_monto_a_descontar, 0));
END;
$$;
