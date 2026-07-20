-- ============================================================
-- 0042_proveedor_id_nullable.sql
-- Permite cargar un gasto/compra sin dar de alta un proveedor
-- (pedido de Paola: combustible, ropa, gastos sueltos sin CUIT).
-- El campo "concepto" (ya obligatorio) describe el gasto.
-- ============================================================

ALTER TABLE compras_proveedores
  ALTER COLUMN proveedor_id DROP NOT NULL;
