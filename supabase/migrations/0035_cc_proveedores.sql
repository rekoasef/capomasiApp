-- ============================================================
-- 0035_cc_proveedores.sql
--
-- Cuenta corriente por proveedor (saldo acumulado), mismo patrón
-- que v_cuenta_corriente de clientes. Cierra el gap de Fase 2
-- del roadmap (docs/funcional/ROADMAP_PENDIENTES.md).
-- ============================================================

CREATE OR REPLACE VIEW v_cuenta_corriente_proveedores
WITH (security_invoker = true)
AS
SELECT
  p.id                                          AS proveedor_id,
  p.nombre                                      AS proveedor_nombre,
  COALESCE(SUM(c.importe_total), 0)             AS total_comprado,
  COALESCE(SUM(pg.importe), 0)                  AS total_pagado,
  COALESCE(SUM(c.importe_total), 0)
    - COALESCE(SUM(pg.importe), 0)              AS saldo_pendiente,
  COUNT(c.id) FILTER (
    WHERE c.estado IN ('PENDIENTE', 'PARCIALMENTE_PAGADA')
  )                                             AS compras_pendientes
FROM proveedores p
LEFT JOIN compras_proveedores c ON c.proveedor_id = p.id AND c.estado != 'ANULADA'
LEFT JOIN pagos_proveedores pg ON pg.compra_id = c.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.nombre;
