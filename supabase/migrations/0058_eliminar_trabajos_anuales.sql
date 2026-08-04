-- ============================================================
-- 0058_eliminar_trabajos_anuales.sql
-- Se elimina el módulo "Trabajos" (honorarios_anuales): quedó
-- desconectado del flujo real de facturación/cobranza (avanzar a
-- COBRADO no generaba liquidación ni movía la cuenta corriente) y
-- confundía a la clienta. Decisión de Paola (2026-08-03): sacarlo.
--
-- honorarios_anuales_empleadas es una tabla huérfana que nunca
-- llegó a usarse desde el código de la app.
--
-- trg_auto_trabajo_anual / fn_auto_trabajo_desde_anual generaban
-- trabajos_realizados al finalizar un trabajo anual; esa tabla y
-- el resto del sistema de puntos se mantienen (alimentados por
-- fn_auto_trabajo_desde_liquidacion y por vencimientos).
-- ============================================================

DROP TRIGGER IF EXISTS trg_auto_trabajo_anual ON honorarios_anuales;
DROP FUNCTION IF EXISTS fn_auto_trabajo_desde_anual();

DROP TABLE IF EXISTS honorarios_anuales_empleadas;
DROP TABLE IF EXISTS honorarios_anuales;
