-- ============================================================
-- 0063_historial_egresos_estudio.sql
--
-- Pedido de Paola (reunión 2026-08-04): quiere ver en "Proveedores"
-- TODO lo que salió del estudio en un solo historial — no solo las
-- compras a proveedores, sino también los gastos del estudio
-- (pagos_gastos con categoría ambito='ESTUDIO') y los sueldos
-- pagados a empleadas (pagos_empleadas). Una sola vista de solo
-- lectura que une las 3 fuentes de egreso; no crea ni modifica
-- ninguna tabla, cada fuente sigue gestionándose donde ya vivía.
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
