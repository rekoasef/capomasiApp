-- ============================================================
-- 0039_catchup_schema_prod.sql
-- Reconcilia el repo con columnas que ya existen en la base de
-- producción pero nunca quedaron documentadas en una migración
-- committeada (se aplicaron directo vía SQL editor / MCP).
--
-- Todo usa IF NOT EXISTS: si ya está aplicado en prod, es un no-op;
-- sirve para que un clon nuevo (o un ambiente de staging) llegue
-- al mismo estado real.
-- ============================================================

-- ── puntos_trabajo_config ──────────────────────────────────────
-- Soporte de recurrencia automática (generarDesdeConfig) y
-- asignación de empleada responsable, ya usados por el flujo de
-- Vencimientos → Trabajos pero nunca migrados.

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS empleada_id UUID REFERENCES empleadas(id);

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS tipo_vencimiento TEXT NOT NULL DEFAULT 'A_DEMANDA';

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS dia_vencimiento_mensual SMALLINT;

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS mes_vencimiento_anual SMALLINT;

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS dia_vencimiento_anual SMALLINT;

-- ── vencimientos ────────────────────────────────────────────────
-- Vínculo a la config que generó la instancia + snapshot de puntos
-- al momento de generarla (para no verse afectado por ediciones
-- posteriores a la config).

ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS puntos_config_id UUID REFERENCES puntos_trabajo_config(id);

ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS puntos_snapshot NUMERIC;

-- estado_avance ya tiene CHECK con 'APROBADO' incluido en prod
-- (agregado junto con el resto del flujo laboral). Se recrea acá
-- el constraint completo para que el repo quede a la par.

ALTER TABLE vencimientos
  DROP CONSTRAINT IF EXISTS vencimientos_estado_avance_check;

ALTER TABLE vencimientos
  ADD CONSTRAINT vencimientos_estado_avance_check
  CHECK (estado_avance IN ('PENDIENTE', 'INICIADO', 'EN_PROCESO', 'TERMINADO', 'APROBADO'));

-- Evita duplicar instancias generadas desde la misma config para la
-- misma fecha (generarDesdeConfig es idempotente gracias a esto).
CREATE UNIQUE INDEX IF NOT EXISTS idx_vencimientos_puntos_config_fecha
  ON vencimientos(puntos_config_id, fecha_vencimiento)
  WHERE puntos_config_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vencimientos_config
  ON vencimientos(puntos_config_id);

-- ── Trigger: registrar puntos al aprobar ──────────────────────
-- Cuando un vencimiento generado desde config pasa a APROBADO,
-- registra el puntaje (snapshot tomado al generar la instancia)
-- para la empleada asignada.

CREATE OR REPLACE FUNCTION fn_registrar_puntos_al_aprobar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF  NEW.estado_avance = 'APROBADO'
  AND (OLD.estado_avance IS DISTINCT FROM 'APROBADO')
  AND NEW.empleada_id IS NOT NULL
  AND NEW.puntos_snapshot IS NOT NULL
  AND NEW.puntos_snapshot > 0
  THEN
    INSERT INTO registros_puntaje_empleadas (
      empleada_id,
      periodo_mes,
      periodo_anio,
      descripcion,
      puntos,
      tipo_trabajo
    ) VALUES (
      NEW.empleada_id,
      EXTRACT(MONTH FROM NEW.fecha_vencimiento)::integer,
      EXTRACT(YEAR  FROM NEW.fecha_vencimiento)::integer,
      COALESCE(NEW.descripcion, NEW.tipo_vencimiento),
      NEW.puntos_snapshot,
      NEW.tipo_vencimiento
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_puntos_al_aprobar ON vencimientos;

CREATE TRIGGER trg_registrar_puntos_al_aprobar
  AFTER UPDATE ON vencimientos
  FOR EACH ROW
  EXECUTE FUNCTION fn_registrar_puntos_al_aprobar();
