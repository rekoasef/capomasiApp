-- ============================================================
-- 0064_gasto_proveedor_directo.sql
--
-- Pedido de Paola (2026-08-05): cargar una compra/gasto a
-- proveedores ya no pasa por un estado "pendiente" que después
-- hay que "pagar" aparte — se carga directamente como gasto (con
-- medio de pago incluido en el mismo alta) y ya queda pagado.
-- "Anular" ahora puede usarse también sobre gastos ya pagados
-- (para corregir un alta equivocada), así que la vista de
-- historial de egresos tiene que excluir explícitamente las
-- compras anuladas — antes no hacía falta porque solo las compras
-- sin pagos (PENDIENTE) podían anularse.
-- ============================================================

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
