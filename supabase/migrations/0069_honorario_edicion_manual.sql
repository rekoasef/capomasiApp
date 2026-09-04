-- ============================================================
-- 0069_honorario_edicion_manual.sql
-- Paola, 2026-09-04: "me tiene que permitir modificar los honorarios" y
-- "que me quede el historial para ver qué les iba cobrando, por ejemplo si eran
-- más o menos empleados o servicios, sino no sé cómo varía además de la inflación".
--
-- Hasta ahora el honorario solo se podía mover por porcentaje (fn_aplicar_ajuste_
-- honorario). Se agrega la edición manual del monto, con observación obligatoria,
-- que cierra la fila vigente y abre una nueva: el historial queda igual que con un
-- ajuste, pero marcado como manual y con el motivo escrito.
--
-- Excepción: si el honorario vigente se cargó hoy, se corrige esa misma fila en vez
-- de abrir otra — es una corrección de lo que se acaba de cargar, no un cambio de
-- honorario, y no tiene sentido que ensucie el historial con dos filas del mismo día.
--
-- Se agrega columna `origen` para distinguir en el historial las tres cosas que
-- hoy se mezclan: la carga inicial, el ajuste por porcentaje y la edición manual.
--
-- De paso: fn_aplicar_ajuste_honorario nunca estuvo versionada en el repo (se creó
-- desde el SQL Editor) y es SECURITY DEFINER sin chequear rol, así que salteaba la
-- RLS que reserva la escritura de honorarios al admin. Queda acá con is_admin().
-- ============================================================

-- ── 1. Origen de cada fila del historial ──────────────────────
ALTER TABLE honorarios_mensuales
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'MANUAL';

ALTER TABLE honorarios_mensuales DROP CONSTRAINT IF EXISTS honorarios_mensuales_origen_check;
ALTER TABLE honorarios_mensuales
  ADD CONSTRAINT honorarios_mensuales_origen_check
  CHECK (origen IN ('INICIAL', 'AJUSTE', 'MANUAL'));

-- Backfill: hasta hoy solo existían cargas iniciales y ajustes por porcentaje
UPDATE honorarios_mensuales
   SET origen = CASE WHEN porcentaje_ajuste IS NOT NULL THEN 'AJUSTE' ELSE 'INICIAL' END;

-- ── 2. Ajuste por porcentaje (ahora sí versionado, ahora sí solo admin) ──
CREATE OR REPLACE FUNCTION fn_aplicar_ajuste_honorario(
  p_cliente_id       UUID,
  p_porcentaje       NUMERIC,
  p_notas            TEXT DEFAULT NULL,
  p_frecuencia_meses INT DEFAULT NULL
)
RETURNS honorarios_mensuales
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual      honorarios_mensuales;
  v_nuevo_monto NUMERIC(14,2);
  v_nuevo       honorarios_mensuales;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede modificar honorarios';
  END IF;

  SELECT * INTO v_actual
  FROM honorarios_mensuales
  WHERE cliente_id = p_cliente_id AND vigente_hasta IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay honorario activo para el cliente';
  END IF;

  v_nuevo_monto := ROUND(v_actual.monto * (1 + p_porcentaje / 100), 2);

  UPDATE honorarios_mensuales
  SET vigente_hasta = CURRENT_DATE
  WHERE id = v_actual.id;

  INSERT INTO honorarios_mensuales (
    cliente_id, monto, frecuencia_ajuste_meses,
    vigente_desde, porcentaje_ajuste, notas, origen, creado_por
  ) VALUES (
    p_cliente_id,
    v_nuevo_monto,
    COALESCE(p_frecuencia_meses, v_actual.frecuencia_ajuste_meses),
    CURRENT_DATE,
    p_porcentaje,
    p_notas,
    'AJUSTE',
    auth.uid()
  )
  RETURNING * INTO v_nuevo;

  RETURN v_nuevo;
END;
$$;

-- ── 3. Edición manual del monto ───────────────────────────────
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

  -- Corrección de lo cargado hoy: se pisa la fila vigente, no se abre otra
  IF v_actual.vigente_desde = CURRENT_DATE THEN
    UPDATE honorarios_mensuales
       SET monto                   = p_monto,
           frecuencia_ajuste_meses = v_frecuencia,
           notas                   = TRIM(p_observacion),
           -- El monto ya no es el resultado de ese porcentaje
           porcentaje_ajuste       = CASE WHEN origen = 'AJUSTE' THEN NULL ELSE porcentaje_ajuste END,
           origen                  = CASE WHEN origen = 'AJUSTE' THEN 'MANUAL' ELSE origen END
     WHERE id = v_actual.id
    RETURNING * INTO v_nuevo;

    RETURN v_nuevo;
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
