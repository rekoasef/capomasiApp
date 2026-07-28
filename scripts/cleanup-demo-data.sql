-- ============================================================
-- cleanup-demo-data.sql
-- Revierte todo lo cargado por seed-demo-data.sql. Borra en orden
-- inverso de dependencias, anclado en el prefijo "DEMO " (clientes/
-- empleadas/proveedores) y el tag "[DEMO]" (conceptos/notas sueltos).
--
-- No toca ningún dato real — todos los WHERE filtran exclusivamente
-- por esos marcadores.
--
-- Nota: no borra audit_log (son solo registros históricos de las
-- acciones que generaron los triggers/RPCs durante la carga; no
-- bloquean nada si quedan, y separarlos de la actividad real de
-- Paola en esos mismos días no es seguro de hacer por texto).
-- ============================================================

BEGIN;

-- 1) fondos_movimientos generados por recibos/pagos/cheques demo
DELETE FROM fondos_movimientos
WHERE referencia_id IN (SELECT id FROM recibos WHERE notas LIKE '[DEMO]%')
   OR referencia_id IN (SELECT id FROM pagos_proveedores WHERE notas LIKE '[DEMO]%')
   OR referencia_id IN (SELECT id FROM pagos_empleadas WHERE notas = '[DEMO]')
   OR cheque_id IN (SELECT id FROM cheques WHERE notas LIKE '[DEMO]%');

-- 2) Empleadas: pagos, liquidaciones, puntaje
DELETE FROM pagos_empleadas WHERE notas = '[DEMO]';
DELETE FROM liquidaciones_empleadas WHERE observaciones = '[DEMO]';
DELETE FROM registros_puntaje_empleadas
WHERE empleada_id IN (SELECT id FROM empleadas WHERE nombre = 'DEMO');
DELETE FROM saldo_puntaje_empleadas
WHERE empleada_id IN (SELECT id FROM empleadas WHERE nombre = 'DEMO');

-- 3) Proveedores: pagos, compras
DELETE FROM pagos_proveedores WHERE notas LIKE '[DEMO]%';
DELETE FROM compras_proveedores
WHERE proveedor_id IN (SELECT id FROM proveedores WHERE nombre LIKE 'DEMO %');

-- 4) Cobranzas: imputaciones, recibos, cheques, liquidaciones
DELETE FROM imputaciones
WHERE recibo_id IN (SELECT id FROM recibos WHERE notas LIKE '[DEMO]%')
   OR liquidacion_id IN (SELECT id FROM liquidaciones WHERE notas = '[DEMO]');
DELETE FROM recibos WHERE notas LIKE '[DEMO]%';
DELETE FROM cheques WHERE notas LIKE '[DEMO]%';
DELETE FROM liquidaciones WHERE notas = '[DEMO]';
DELETE FROM honorarios_anuales WHERE notas = '[DEMO]';

-- 5) Vencimientos, trabajos, gastos
DELETE FROM vencimientos WHERE descripcion LIKE '[DEMO]%';
DELETE FROM trabajos_realizados WHERE descripcion LIKE '[DEMO]%';
DELETE FROM pagos_gastos WHERE concepto LIKE '[DEMO]%';

-- 6) Configuración
DELETE FROM puntos_trabajo_config
WHERE cliente_id IN (SELECT id FROM clientes WHERE nombre LIKE 'DEMO %');
DELETE FROM comisiones_config
WHERE empleada_id IN (SELECT id FROM empleadas WHERE nombre = 'DEMO');
DELETE FROM honorarios_mensuales WHERE notas LIKE '[DEMO]%';

-- 7) Anchors
DELETE FROM proveedores WHERE nombre LIKE 'DEMO %';
DELETE FROM empleadas WHERE nombre = 'DEMO';
DELETE FROM clientes WHERE nombre LIKE 'DEMO %';

COMMIT;

-- Verificación (todo debería dar 0):
SELECT 'clientes' t, count(*) FROM clientes WHERE nombre LIKE 'DEMO %'
UNION ALL SELECT 'empleadas', count(*) FROM empleadas WHERE nombre = 'DEMO'
UNION ALL SELECT 'proveedores', count(*) FROM proveedores WHERE nombre LIKE 'DEMO %'
UNION ALL SELECT 'liquidaciones', count(*) FROM liquidaciones WHERE notas = '[DEMO]'
UNION ALL SELECT 'recibos', count(*) FROM recibos WHERE notas LIKE '[DEMO]%'
UNION ALL SELECT 'cheques', count(*) FROM cheques WHERE notas LIKE '[DEMO]%'
UNION ALL SELECT 'vencimientos', count(*) FROM vencimientos WHERE descripcion LIKE '[DEMO]%'
UNION ALL SELECT 'trabajos_realizados', count(*) FROM trabajos_realizados WHERE descripcion LIKE '[DEMO]%'
UNION ALL SELECT 'compras_proveedores', count(*) FROM compras_proveedores WHERE concepto LIKE '[DEMO]%'
UNION ALL SELECT 'pagos_gastos', count(*) FROM pagos_gastos WHERE concepto LIKE '[DEMO]%';
