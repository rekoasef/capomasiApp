-- ============================================================
-- 0044_ingresos_negro_blanco_iva.sql
-- Separa el ingreso mensual en 3 métricas (pedido de Paola,
-- reunión 2026-07-16):
--   - ingreso_base_negro: Factura C + Presupuesto (sin IVA, informal)
--   - facturado_cliente_neto: Factura A + Factura B (neto, sin IVA)
--   - iva_facturado: diferencia entre lo facturado con IVA y el neto
--
-- Se agregan como columnas nuevas en v_ingresos_mensuales; se
-- mantienen total_liquidado/total_facturado para no romper otros
-- consumidores (reportes).
-- ============================================================

CREATE OR REPLACE VIEW v_ingresos_mensuales AS
SELECT
  DATE_TRUNC('month', l.fecha_liquidacion)::DATE AS mes,
  COUNT(l.id)                                    AS cantidad_liquidaciones,
  COALESCE(SUM(l.importe_liquidado), 0)          AS total_liquidado,
  COALESCE(SUM(COALESCE(l.importe_facturado, l.importe_liquidado)), 0) AS total_facturado,
  COALESCE(SUM(l.importe_liquidado)
    FILTER (WHERE l.tipo_comprobante IN ('FC_C', 'PRESUPUESTO')), 0)   AS ingreso_base_negro,
  COALESCE(SUM(l.importe_liquidado)
    FILTER (WHERE l.tipo_comprobante IN ('FC_A', 'FC_B')), 0)          AS facturado_cliente_neto,
  COALESCE(SUM(COALESCE(l.importe_facturado, l.importe_liquidado) - l.importe_liquidado)
    FILTER (WHERE l.tipo_comprobante IN ('FC_A', 'FC_B')), 0)          AS iva_facturado
FROM liquidaciones l
WHERE l.estado <> 'ANULADA'
  AND l.tipo_liquidacion = 'NORMAL'
GROUP BY 1
ORDER BY 1 DESC;
