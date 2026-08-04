-- ============================================================
-- 0057_trabajos_facturar_aparte.sql
-- Agrega a honorarios_anuales el mismo criterio informativo que
-- 0040_facturar_aparte.sql introdujo para puntos_trabajo_config:
-- si el trabajo se factura aparte del abono mensual del cliente,
-- o si ya está incluido en el abono. Se define al crear el trabajo
-- y se muestra en el historial de trabajos del cliente.
-- ============================================================

ALTER TABLE honorarios_anuales
  ADD COLUMN IF NOT EXISTS facturar_aparte BOOLEAN NOT NULL DEFAULT TRUE;
