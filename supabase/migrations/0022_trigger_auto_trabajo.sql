-- ============================================================
-- 0022_trigger_auto_trabajo.sql
-- Auto-generación de trabajos_realizados cuando una empleada
-- registra una liquidación o finaliza un trabajo anual.
-- ============================================================

-- ── 1. Función: auto-trabajo desde liquidaciones ───────────────
-- Dispara en INSERT sobre liquidaciones.
-- Solo actúa cuando auth.uid() corresponde a una empleada.

CREATE OR REPLACE FUNCTION fn_auto_trabajo_desde_liquidacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empleada_id UUID;
  v_fecha       DATE;
BEGIN
  -- Ignorar saldos iniciales (migración del Excel)
  IF NEW.tipo_liquidacion = 'SALDO_INICIAL' THEN
    RETURN NEW;
  END IF;

  -- Buscar empleada asociada al usuario que hace la acción
  SELECT id INTO v_empleada_id
  FROM empleadas
  WHERE usuario_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  -- Si no es una empleada (ej: admin) no hacer nada
  IF v_empleada_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_fecha := COALESCE(NEW.fecha_liquidacion, CURRENT_DATE);

  INSERT INTO trabajos_realizados (
    empleada_id,
    fecha,
    cliente_id,
    tipo_trabajo,
    descripcion,
    periodo_mes,
    periodo_anio
  ) VALUES (
    v_empleada_id,
    v_fecha,
    NEW.cliente_id,
    NEW.tipo_servicio,
    COALESCE(NULLIF(NEW.detalle, ''), NEW.tipo_servicio),
    EXTRACT(MONTH FROM v_fecha)::INT,
    EXTRACT(YEAR FROM v_fecha)::INT
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_trabajo_liquidacion
  AFTER INSERT ON liquidaciones
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_trabajo_desde_liquidacion();

-- ── 2. Función: auto-trabajo al finalizar trabajo anual ────────
-- Dispara en UPDATE sobre honorarios_anuales cuando el estado
-- pasa a FINALIZADO.
-- Prioridad: usuario que hace el cambio → asignado_a.

CREATE OR REPLACE FUNCTION fn_auto_trabajo_desde_anual()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empleada_id  UUID;
  v_cliente_nombre TEXT;
BEGIN
  -- Solo cuando transiciona a FINALIZADO
  IF NEW.estado != 'FINALIZADO' OR OLD.estado = 'FINALIZADO' THEN
    RETURN NEW;
  END IF;

  -- Primero: el usuario que cambió el estado
  SELECT id INTO v_empleada_id
  FROM empleadas
  WHERE usuario_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  -- Fallback: el usuario asignado al trabajo
  IF v_empleada_id IS NULL AND NEW.asignado_a IS NOT NULL THEN
    SELECT id INTO v_empleada_id
    FROM empleadas
    WHERE usuario_id = NEW.asignado_a
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_empleada_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nombre INTO v_cliente_nombre
  FROM clientes WHERE id = NEW.cliente_id;

  INSERT INTO trabajos_realizados (
    empleada_id,
    fecha,
    cliente_id,
    tipo_trabajo,
    descripcion,
    periodo_mes,
    periodo_anio
  ) VALUES (
    v_empleada_id,
    CURRENT_DATE,
    NEW.cliente_id,
    NEW.tipo_trabajo,
    NEW.tipo_trabajo
      || ' ' || NEW.anio::TEXT
      || COALESCE(' — ' || v_cliente_nombre, ''),
    EXTRACT(MONTH FROM CURRENT_DATE)::INT,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_trabajo_anual
  AFTER UPDATE ON honorarios_anuales
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_trabajo_desde_anual();
