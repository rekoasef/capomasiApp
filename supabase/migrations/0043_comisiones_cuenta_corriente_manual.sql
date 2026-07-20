-- ============================================================
-- 0043_comisiones_cuenta_corriente_manual.sql
-- Simplifica el sistema de puntos de empleadas a una cuenta
-- corriente manual (acordado con Paola, reunión 2026-07-16):
-- los puntos se acumulan solos en tiempo real, y es Paola quien
-- decide cuánto descontar al liquidar (no hay cálculo automático
-- de "N umbrales completos").
--
-- Reemplaza el flujo fn_confirmar_comision_puntaje / fn_liquidar_
-- comision_puntaje (que quedan sin uso, no se borran por no
-- romper histórico ya registrado) por:
--   1) Triggers que mantienen saldo_puntaje_empleadas en tiempo
--      real a medida que se insertan/eliminan registros_puntaje_empleadas.
--   2) fn_ajustar_saldo_puntaje: descuento manual con validación
--      de saldo suficiente + registro en audit_log.
--
-- Backfill: hasta ahora saldo_puntaje_empleadas solo se actualizaba
-- al confirmar manualmente (y solo si se superaba el umbral), por
-- lo que empleadas con puntos ya cargados pero nunca confirmados
-- no tenían fila en saldo_puntaje_empleadas. Se crea esa fila con
-- el total ya ganado (no toca a quienes ya tienen fila, para no
-- duplicar puntos ya reflejados en un confirm previo).
-- ============================================================

INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, updated_at)
SELECT rpe.empleada_id, SUM(rpe.puntos), NOW()
FROM registros_puntaje_empleadas rpe
WHERE NOT EXISTS (
  SELECT 1 FROM saldo_puntaje_empleadas s WHERE s.empleada_id = rpe.empleada_id
)
GROUP BY rpe.empleada_id
ON CONFLICT (empleada_id) DO NOTHING;

-- ── Triggers: mantener saldo en tiempo real ───────────────────

CREATE OR REPLACE FUNCTION fn_sync_saldo_puntaje_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, updated_at)
  VALUES (NEW.empleada_id, NEW.puntos, NOW())
  ON CONFLICT (empleada_id) DO UPDATE
    SET puntos_acumulados = saldo_puntaje_empleadas.puntos_acumulados + NEW.puntos,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_saldo_puntaje_insert ON registros_puntaje_empleadas;

CREATE TRIGGER trg_sync_saldo_puntaje_insert
  AFTER INSERT ON registros_puntaje_empleadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_saldo_puntaje_insert();

CREATE OR REPLACE FUNCTION fn_sync_saldo_puntaje_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE saldo_puntaje_empleadas
     SET puntos_acumulados = puntos_acumulados - OLD.puntos,
         updated_at = NOW()
   WHERE empleada_id = OLD.empleada_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_saldo_puntaje_delete ON registros_puntaje_empleadas;

CREATE TRIGGER trg_sync_saldo_puntaje_delete
  AFTER DELETE ON registros_puntaje_empleadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_saldo_puntaje_delete();

-- ── Función: ajuste manual del saldo (descuento) ──────────────

CREATE OR REPLACE FUNCTION fn_ajustar_saldo_puntaje(
  p_empleada_id UUID,
  p_puntos_a_descontar NUMERIC,
  p_nota TEXT DEFAULT NULL
)
RETURNS TABLE (puntos_acumulados NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_actual NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede ajustar el saldo de puntos';
  END IF;

  IF p_puntos_a_descontar IS NULL OR p_puntos_a_descontar <= 0 THEN
    RAISE EXCEPTION 'Los puntos a descontar deben ser mayores a 0';
  END IF;

  SELECT COALESCE(puntos_acumulados, 0) INTO v_saldo_actual
  FROM saldo_puntaje_empleadas
  WHERE empleada_id = p_empleada_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_saldo_actual := 0;
  END IF;

  IF p_puntos_a_descontar > v_saldo_actual THEN
    RAISE EXCEPTION 'No se puede descontar % pts: el saldo disponible es % pts',
      p_puntos_a_descontar, v_saldo_actual;
  END IF;

  INSERT INTO saldo_puntaje_empleadas (empleada_id, puntos_acumulados, updated_at)
  VALUES (p_empleada_id, v_saldo_actual - p_puntos_a_descontar, NOW())
  ON CONFLICT (empleada_id) DO UPDATE
    SET puntos_acumulados = v_saldo_actual - p_puntos_a_descontar,
        updated_at = NOW();

  INSERT INTO audit_log (usuario_id, tabla_afectada, registro_id, accion, valor_anterior, valor_nuevo)
  VALUES (
    auth.uid(),
    'saldo_puntaje_empleadas',
    p_empleada_id,
    'AJUSTE_MANUAL_PUNTOS',
    jsonb_build_object('puntos_acumulados', v_saldo_actual),
    jsonb_build_object(
      'puntos_acumulados', v_saldo_actual - p_puntos_a_descontar,
      'puntos_descontados', p_puntos_a_descontar,
      'nota', p_nota
    )
  );

  RETURN QUERY SELECT (v_saldo_actual - p_puntos_a_descontar);
END;
$$;
