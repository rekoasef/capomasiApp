-- ============================================================
-- 0040_facturar_aparte.sql
-- Separa el campo económico de "puntos" (comisión de la empleada)
-- del criterio de si un trabajo debe facturarse aparte del abono
-- mensual del cliente. Pedido de Paola (reunión 2026-07-16): un
-- mismo tipo de trabajo puede generar comisión sin necesariamente
-- facturarse aparte (ya está incluido en el abono).
-- ============================================================

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS facturar_aparte BOOLEAN NOT NULL DEFAULT TRUE;

-- Snapshot al momento de generar la instancia (mismo patrón que puntos_snapshot),
-- para que cambios posteriores en la config no alteren vencimientos ya generados.
ALTER TABLE vencimientos
  ADD COLUMN IF NOT EXISTS facturar_aparte BOOLEAN;
