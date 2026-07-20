-- ============================================================
-- 0032_vencimientos_flujo_laboral.sql
-- Amplía la tabla vencimientos para soportar el flujo laboral:
-- - estado_avance: seguimiento por estados (Luciana/Victoria)
-- - observaciones_empleada: notas de avance de la empleada
-- - facturado / liquidacion_id: para la cola de facturación
-- ============================================================

-- 1. Estado de avance para el flujo de empleadas
ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS estado_avance TEXT
    NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado_avance IN ('PENDIENTE', 'INICIADO', 'EN_PROCESO', 'TERMINADO'));

-- 2. Observaciones que agrega la empleada al avanzar el estado
ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS observaciones_empleada TEXT;

-- 3. Control de facturación
ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS facturado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS liquidacion_id UUID REFERENCES liquidaciones(id) ON DELETE SET NULL;

-- 4. Índices útiles para las queries del portal empleadas y cola de facturación
CREATE INDEX IF NOT EXISTS idx_vencimientos_estado_avance
  ON vencimientos(estado_avance)
  WHERE completado = FALSE;

CREATE INDEX IF NOT EXISTS idx_vencimientos_cola_facturacion
  ON vencimientos(facturado, estado_avance, ambito)
  WHERE facturado = FALSE AND estado_avance = 'TERMINADO';

-- 5. Sincronizar completado con estado_avance via trigger
CREATE OR REPLACE FUNCTION fn_sync_completado_desde_estado_avance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado_avance = 'TERMINADO' AND OLD.estado_avance != 'TERMINADO' THEN
    NEW.completado    := TRUE;
    NEW.completado_at := NOW();
    NEW.completado_by := auth.uid();
  END IF;

  IF NEW.estado_avance != 'TERMINADO' AND OLD.estado_avance = 'TERMINADO' THEN
    NEW.completado    := FALSE;
    NEW.completado_at := NULL;
    NEW.completado_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_completado
  BEFORE UPDATE ON vencimientos
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_completado_desde_estado_avance();
