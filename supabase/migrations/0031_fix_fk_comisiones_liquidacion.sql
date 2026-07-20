-- ============================================================
-- 0031_fix_fk_comisiones_liquidacion.sql
-- La FK liquidacion_id no tenía ON DELETE SET NULL, bloqueando
-- la eliminación de liquidaciones_empleadas.
-- Fix: recrear FK con ON DELETE SET NULL + trigger que revierte
-- el estado a PENDIENTE cuando se desvincula la liquidación.
-- ============================================================

ALTER TABLE comisiones_puntaje_registradas
  DROP CONSTRAINT IF EXISTS comisiones_puntaje_registradas_liquidacion_id_fkey;

ALTER TABLE comisiones_puntaje_registradas
  ADD CONSTRAINT comisiones_puntaje_registradas_liquidacion_id_fkey
  FOREIGN KEY (liquidacion_id)
  REFERENCES liquidaciones_empleadas(id)
  ON DELETE SET NULL;

-- Trigger: cuando liquidacion_id queda NULL, revertir a PENDIENTE
CREATE OR REPLACE FUNCTION fn_revertir_comision_al_borrar_liquidacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.liquidacion_id IS NULL AND OLD.liquidacion_id IS NOT NULL THEN
    NEW.estado       := 'PENDIENTE';
    NEW.liquidada_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revertir_comision_liquidacion
  ON comisiones_puntaje_registradas;

CREATE TRIGGER trg_revertir_comision_liquidacion
  BEFORE UPDATE ON comisiones_puntaje_registradas
  FOR EACH ROW
  EXECUTE FUNCTION fn_revertir_comision_al_borrar_liquidacion();
