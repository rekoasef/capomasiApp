-- ============================================================
-- 0034_reportes_ingresos.sql
-- Vistas de reportes para el módulo de Estadísticas y Reportes
-- (Módulo 9 de la propuesta / Fase 3.2 de CLAUDE.md).
--
-- 1) v_ingresos_por_tipo_mes: ingresos agrupados por mes y tipo_servicio
-- 2) v_ingresos_por_empleada_mes: ingresos agrupados por mes y empleada
--    (atribuye la liquidación a la empleada del vencimiento fiscal que la
--     originó, si vino de la Cola de Facturación; si no, usa generado_por)
-- ============================================================

CREATE OR REPLACE VIEW v_ingresos_por_tipo_mes AS
SELECT
  DATE_TRUNC('month', l.fecha_liquidacion)::DATE                        AS mes,
  l.tipo_servicio                                                       AS tipo_servicio,
  COUNT(l.id)                                                           AS cantidad,
  COALESCE(SUM(l.importe_liquidado), 0)                                 AS total_liquidado,
  COALESCE(SUM(COALESCE(l.importe_facturado, l.importe_liquidado)), 0)  AS total_facturado
FROM liquidaciones l
WHERE l.estado <> 'ANULADA'
  AND l.tipo_liquidacion = 'NORMAL'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

CREATE OR REPLACE VIEW v_ingresos_por_empleada_mes AS
WITH liq_empleada AS (
  SELECT DISTINCT ON (v.liquidacion_id)
    v.liquidacion_id,
    e.nombre AS empleada_nombre
  FROM vencimientos v
  JOIN empleadas e ON e.id = v.empleada_id
  WHERE v.liquidacion_id IS NOT NULL
  ORDER BY v.liquidacion_id, v.fecha_vencimiento
)
SELECT
  DATE_TRUNC('month', l.fecha_liquidacion)::DATE                AS mes,
  COALESCE(le.empleada_nombre, l.generado_por, 'Sin asignar')   AS empleada,
  COUNT(l.id)                                                   AS cantidad,
  COALESCE(SUM(l.importe_liquidado), 0)                         AS total_liquidado
FROM liquidaciones l
LEFT JOIN liq_empleada le ON le.liquidacion_id = l.id
WHERE l.estado <> 'ANULADA'
  AND l.tipo_liquidacion = 'NORMAL'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
