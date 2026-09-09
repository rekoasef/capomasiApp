-- ============================================================
-- 0075_compras_ambito_y_eliminar.sql
--
-- Tres problemas que reportó Paola el 2026-09-09, todos con la
-- misma raíz: la migración 0064 sacó el paso "pendiente → pagar"
-- de las compras a proveedores y quedaron cabos sueltos.
--
-- 1) Toda compra a proveedor se computaba como gasto del estudio.
--    Los gastos manuales sí distinguen ámbito (categorias_gastos.
--    ambito, migración 0045) pero compras_proveedores no, así que
--    una compra personal (materiales para la casa) le bajaba el
--    resultado del estudio. Se agrega compras_proveedores.ambito
--    y se filtra en las dos vistas que suman ese gasto.
--
-- 2) Anular una compra pagada dejaba viva la plata. La 0049 creó
--    el trigger que manda el pago a fondos y su propio comentario
--    lo avisaba: "No se maneja reversión: ninguno de los dos
--    módulos tiene hoy una operación de anular/eliminar pago". La
--    0064 después habilitó anular sobre compras pagadas sin tapar
--    ese agujero, así que la compra quedaba marcada ANULADA pero
--    el pago y el EGRESO en fondos seguían vivos y la caja quedaba
--    abajo.
--
-- 3) Las compras anuladas se acumulaban a la vista para siempre.
--    Decisión de Renzo (2026-09-09): si fue un error de carga, no
--    sirve que quede en el historial. Se reemplaza el estado
--    ANULADA por un borrado real: fn_eliminar_compra_proveedor
--    revierte el cheque endosado, el movimiento de fondos y el
--    pago, y después borra la compra, todo en una transacción.
--
-- El rastro no se pierde: se agregan los triggers de auditoría que
-- a estas dos tablas les faltaban, así que el borrado queda en
-- audit_log (solo-admin, fuera de las pantallas de Paola).
--
-- El estado ANULADA se mantiene en el CHECK porque hay filas
-- históricas que lo usan; simplemente deja de generarse.
--
-- El ámbito arranca en 'ESTUDIO' para todas las compras ya
-- cargadas: es el comportamiento que tenían hasta hoy, así que
-- ningún número histórico se mueve solo por aplicar esto.
-- ============================================================

-- ── 1) Ámbito personal / estudio en compras ───────────────────

ALTER TABLE compras_proveedores
  ADD COLUMN IF NOT EXISTS ambito TEXT NOT NULL DEFAULT 'ESTUDIO'
    CHECK (ambito IN ('PERSONAL', 'ESTUDIO'));

CREATE INDEX IF NOT EXISTS idx_compras_ambito ON compras_proveedores(ambito);

-- ── 2) Auditoría de compras y pagos a proveedores ─────────────
-- Faltaban desde la 0011. Sin esto, borrar una compra no dejaba
-- ningún rastro recuperable.

DROP TRIGGER IF EXISTS audit_compras_proveedores ON compras_proveedores;
CREATE TRIGGER audit_compras_proveedores
  AFTER INSERT OR UPDATE OR DELETE ON compras_proveedores
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_pagos_proveedores ON pagos_proveedores;
CREATE TRIGGER audit_pagos_proveedores
  AFTER INSERT OR UPDATE OR DELETE ON pagos_proveedores
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ── 3) Resultado mensual: solo compras del estudio ────────────
-- Idéntica a la 0045 salvo el filtro de ambito en el CTE proveedores.

CREATE OR REPLACE VIEW v_resultado_mensual AS
WITH ingresos AS (
  SELECT mes, total_liquidado AS total_ingresos
  FROM v_ingresos_mensuales
),
sueldos AS (
  SELECT make_date(periodo_anio, periodo_mes, 1) AS mes,
         COALESCE(SUM(importe) FILTER (WHERE tipo_concepto = 'HABER'), 0) AS gasto_sueldos
  FROM liquidaciones_empleadas
  GROUP BY 1
),
proveedores AS (
  SELECT DATE_TRUNC('month', fecha)::DATE AS mes,
         COALESCE(SUM(importe_total), 0) AS gasto_proveedores
  FROM compras_proveedores
  WHERE estado <> 'ANULADA'
    AND ambito = 'ESTUDIO'
  GROUP BY 1
),
gastos_manuales AS (
  SELECT DATE_TRUNC('month', pg.fecha_pago)::DATE AS mes,
         COALESCE(SUM(pg.importe), 0) AS gasto_manual_estudio
  FROM pagos_gastos pg
  JOIN categorias_gastos cg ON cg.id = pg.categoria_id
  WHERE cg.ambito = 'ESTUDIO'
  GROUP BY 1
),
meses AS (
  SELECT mes FROM ingresos
  UNION SELECT mes FROM sueldos
  UNION SELECT mes FROM proveedores
  UNION SELECT mes FROM gastos_manuales
)
SELECT
  m.mes,
  COALESCE(i.total_ingresos, 0)      AS total_ingresos,
  COALESCE(s.gasto_sueldos, 0)       AS gasto_sueldos,
  COALESCE(p.gasto_proveedores, 0)   AS gasto_proveedores,
  COALESCE(g.gasto_manual_estudio, 0) AS gasto_manual_estudio,
  COALESCE(i.total_ingresos, 0)
    - COALESCE(s.gasto_sueldos, 0)
    - COALESCE(p.gasto_proveedores, 0)
    - COALESCE(g.gasto_manual_estudio, 0) AS resultado
FROM meses m
LEFT JOIN ingresos       i ON i.mes = m.mes
LEFT JOIN sueldos        s ON s.mes = m.mes
LEFT JOIN proveedores    p ON p.mes = m.mes
LEFT JOIN gastos_manuales g ON g.mes = m.mes
ORDER BY m.mes DESC;

-- ── 4) Historial de egresos: solo compras del estudio ─────────
-- Idéntica a la 0064 salvo el filtro de ambito en la rama PROVEEDOR.

CREATE OR REPLACE VIEW v_historial_egresos_estudio
WITH (security_invoker = true)
AS
SELECT
  pp.id                                                AS id,
  pp.fecha_pago                                        AS fecha,
  'PROVEEDOR'                                          AS origen,
  COALESCE(prov.nombre, 'Gasto sin proveedor')          AS referencia,
  cp.concepto                                          AS concepto,
  pp.importe                                           AS importe,
  pp.tipo_pago                                         AS medio_pago
FROM pagos_proveedores pp
JOIN compras_proveedores cp ON cp.id = pp.compra_id
LEFT JOIN proveedores prov ON prov.id = cp.proveedor_id
WHERE cp.estado <> 'ANULADA'
  AND cp.ambito = 'ESTUDIO'

UNION ALL

SELECT
  pg.id                                                AS id,
  pg.fecha_pago                                        AS fecha,
  'GASTO_ESTUDIO'                                       AS origen,
  cg.nombre                                            AS referencia,
  pg.concepto                                          AS concepto,
  pg.importe                                           AS importe,
  pg.medio_pago                                        AS medio_pago
FROM pagos_gastos pg
JOIN categorias_gastos cg ON cg.id = pg.categoria_id
WHERE cg.ambito = 'ESTUDIO'

UNION ALL

SELECT
  pe.id                                                AS id,
  pe.fecha_pago                                        AS fecha,
  'SUELDO'                                              AS origen,
  e.nombre                                             AS referencia,
  'Sueldo ' || LPAD(pe.periodo_mes::TEXT, 2, '0') || '/' || pe.periodo_anio AS concepto,
  pe.importe                                           AS importe,
  pe.tipo_pago                                         AS medio_pago
FROM pagos_empleadas pe
JOIN empleadas e ON e.id = pe.empleada_id

ORDER BY fecha DESC;

-- ── 5) Eliminar una compra revirtiendo todo lo que generó ─────

CREATE OR REPLACE FUNCTION fn_eliminar_compra_proveedor(p_compra_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_compra compras_proveedores;
  v_pago   RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede eliminar compras';
  END IF;

  SELECT * INTO v_compra FROM compras_proveedores WHERE id = p_compra_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra no encontrada';
  END IF;

  -- Revertir cada pago antes de borrar la compra: el cheque endosado
  -- vuelve a cartera, se borra el EGRESO que generó el trigger de la
  -- 0049, y se borra el pago. Se borra en vez de contra-asentar
  -- porque esto corrige una carga equivocada, no un hecho económico:
  -- un contra-asiento dejaría dos líneas de ruido en Fondos.
  FOR v_pago IN
    SELECT id, cheque_id FROM pagos_proveedores WHERE compra_id = p_compra_id
  LOOP
    IF v_pago.cheque_id IS NOT NULL THEN
      UPDATE cheques
         SET estado       = 'EN_CARTERA',
             proveedor_id = NULL,
             fecha_cobro  = NULL,
             updated_at   = NOW()
       WHERE id = v_pago.cheque_id
         AND estado = 'ENDOSADO';
    END IF;

    DELETE FROM fondos_movimientos
     WHERE referencia_tipo = 'pago_proveedor'
       AND referencia_id   = v_pago.id;

    DELETE FROM pagos_proveedores WHERE id = v_pago.id;
  END LOOP;

  DELETE FROM compras_proveedores WHERE id = p_compra_id;
END;
$$;

REVOKE ALL ON FUNCTION fn_eliminar_compra_proveedor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_eliminar_compra_proveedor(UUID) TO authenticated;
