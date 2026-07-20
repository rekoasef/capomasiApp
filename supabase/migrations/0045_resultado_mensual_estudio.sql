-- ============================================================
-- 0045_resultado_mensual_estudio.sql
-- Dashboard: gastos del estudio y resultado (pedido de Paola,
-- reunión 2026-07-16). Fuentes de gasto:
--   - Sueldos: liquidaciones_empleadas (HABER)
--   - Proveedores: compras_proveedores
--   - Gastos manuales del estudio: pagos_gastos, filtrados por
--     categorías marcadas ambito = 'ESTUDIO' (luz, SOS, etc. — el
--     módulo de Gastos ya existente, hoy sin distinción personal/estudio)
-- ============================================================

ALTER TABLE categorias_gastos
  ADD COLUMN IF NOT EXISTS ambito TEXT NOT NULL DEFAULT 'PERSONAL'
    CHECK (ambito IN ('PERSONAL', 'ESTUDIO'));

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
