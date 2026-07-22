-- ============================================================
-- 0051_gastos_ambito_en_views.sql
-- La migración 0045 agregó categorias_gastos.ambito (PERSONAL/
-- ESTUDIO) pero las views de detalle no lo exponían todavía —
-- hacía falta para poder filtrar/agrupar el historial y los
-- próximos vencimientos por ámbito en la UI.
-- ============================================================

-- CREATE OR REPLACE VIEW solo permite agregar columnas al final sin
-- romper el contrato existente — por eso categoria_ambito va al final
-- de cada SELECT, no junto a las otras columnas de categoría.

CREATE OR REPLACE VIEW v_pagos_gastos_detalle
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.concepto,
  p.fecha_pago,
  p.medio_pago,
  p.importe,
  p.notas,
  p.comprobante_url,
  p.fecha_vencimiento_pagado,
  c.id AS categoria_id,
  c.nombre AS categoria_nombre,
  c.color AS categoria_color,
  g.id AS gasto_recurrente_id,
  g.descripcion AS gasto_descripcion,
  EXTRACT(YEAR FROM p.fecha_pago)::INT AS anio,
  EXTRACT(MONTH FROM p.fecha_pago)::INT AS mes,
  c.ambito AS categoria_ambito
FROM pagos_gastos p
JOIN categorias_gastos c ON c.id = p.categoria_id
LEFT JOIN gastos_recurrentes g ON g.id = p.gasto_recurrente_id;

CREATE OR REPLACE VIEW v_proximos_vencimientos
WITH (security_invoker = true)
AS
SELECT
  g.id AS gasto_id,
  g.descripcion,
  g.proxima_fecha_vencimiento,
  g.dia_vencimiento,
  c.id AS categoria_id,
  c.nombre AS categoria_nombre,
  c.color AS categoria_color,
  (g.proxima_fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
  c.ambito AS categoria_ambito
FROM gastos_recurrentes g
JOIN categorias_gastos c ON c.id = g.categoria_id
WHERE g.activo = TRUE
  AND c.activo = TRUE
ORDER BY g.proxima_fecha_vencimiento;
