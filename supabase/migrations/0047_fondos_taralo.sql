-- ============================================================
-- 0047_fondos_taralo.sql
-- Cuenta simple de "Taralo" (agente de bolsa), pedido de Paola
-- (reunión 2026-07-16): solo quiere ver aportes y retiros en
-- pesos, sin conciliar contra el banco real ni registrar
-- rendimiento de la inversión. Se agrega como una cuarta cuenta
-- en fondos_movimientos, paralela a banco/efectivo/USD, para no
-- crear una tabla nueva ni un módulo aparte.
--
-- Los dólares ahorrados NO requieren cambios: ya se registran
-- con el campo `importe_usd` existente (se alimentan también
-- automáticamente desde recibos con tipo_pago = 'USD' via
-- fn_recibo_a_fondos), y los conceptos "Compra USD"/"Venta USD"
-- ya existen en el fallback de parametros (CONCEPTO_FONDOS).
-- ============================================================

ALTER TABLE fondos_movimientos
  ADD COLUMN IF NOT EXISTS importe_taralo NUMERIC(14,2) DEFAULT 0;

CREATE OR REPLACE VIEW v_saldo_fondos AS
SELECT
  COALESCE(SUM(importe_banco)     FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_banco)   FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_banco,
  COALESCE(SUM(importe_efectivo)  FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_efectivo) FILTER (WHERE tipo_movimiento = 'EGRESO'), 0)  AS saldo_efectivo,
  COALESCE(SUM(importe_usd)       FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_usd)     FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_usd,
  COALESCE(SUM(importe_taralo)    FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_taralo)  FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_taralo
FROM fondos_movimientos;
