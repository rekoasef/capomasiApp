-- ============================================================
-- 0077_comparativos_con_historico.sql
--
-- Pedido de Paola (2026-09-09): "me lo tiene que mostrar en los
-- comparativos". Los reportes solo miraban `liquidaciones`, que
-- arrancan en septiembre 2026, así que los comparativos estaban
-- prácticamente vacíos: toda la facturación de oct-2025 a ago-2026
-- vive en `facturacion_historica` (migrada del Excel).
--
-- Se puede unir sin doble conteo porque el corte es limpio:
--   facturacion_historica: 2025-10-31 → 2026-08-31
--   liquidaciones reales:  2026-09-01 en adelante
-- (las liquidaciones con fecha 31/08 son SALDO_INICIAL, que ya
-- quedan afuera por el filtro tipo_liquidacion = 'NORMAL')
--
-- POR QUÉ VISTAS NUEVAS Y NO TOCAR LAS EXISTENTES:
-- v_ingresos_mensuales alimenta a v_resultado_mensual (Dashboard).
-- Si le metiéramos el histórico, los meses de oct-2025 a ago-2026
-- quedarían con ingresos pero sin gastos — no migramos gastos
-- históricos — y el Dashboard mostraría una ganancia falsa enorme.
-- Los comparativos usan las vistas _con_historico; el resultado
-- mensual sigue usando las de siempre, solo con datos reales.
--
-- DOS COSAS QUE SE EXCLUYEN / NORMALIZAN:
-- 1. Las 11 filas de "SALDO INICIAL" del Excel son saldos de
--    arranque, no facturación. Sumarlas inflaba octubre 2025 en
--    ~8,3 millones. Se excluyen, igual que las SALDO_INICIAL reales.
-- 2. Los tipos de comprobante y de servicio del Excel son texto
--    libre. Se mapean solo los equivalentes inequívocos; el resto
--    conserva el nombre del Excel y aparece como su propia fila.
--    Quedan sin mapear a propósito, porque elegir su equivalente
--    es una decisión de Paola, no técnica: CERTIFICACION DE BALANCE
--    (¿BALANCE o CERTIFICACIONES?), RECATEGORIZACION MONOTRIBUTO
--    (hay dos códigos, enero y julio), SALDO TECNICO DE IVA y
--    RECUPERO IVA DE EXPORTACION.
-- ============================================================

-- ── Facturación histórica normalizada al vocabulario del sistema ──

CREATE OR REPLACE VIEW v_facturacion_historica_normalizada AS
SELECT
  fh.fecha_liquidacion,
  fh.importe_liquidado,
  fh.importe_facturado,
  -- Comprobante: el Excel escribe "FC A", el sistema "FC_A".
  -- NC A es una nota de crédito sobre factura A (importe negativo).
  CASE upper(btrim(fh.comprobante_tipo))
    WHEN 'FC A'        THEN 'FC_A'
    WHEN 'NC A'        THEN 'FC_A'
    WHEN 'FC B'        THEN 'FC_B'
    WHEN 'FC C'        THEN 'FC_C'
    WHEN 'PRESUPUESTO' THEN 'PRESUPUESTO'
    ELSE NULL
  END AS tipo_comprobante,
  -- Servicio: espacios por guiones bajos, más los sinónimos claros.
  CASE upper(replace(btrim(fh.servicio), ' ', '_'))
    WHEN 'RECUPERO_GASTOS'            THEN 'RECUPERO_DE_GASTOS'
    WHEN 'CONSULTORIA_COSTOS_MENSUAL' THEN 'CONSULTORIA_COSTOS'
    WHEN 'GANANCIA_PERSONA_FISICA'    THEN 'GANANCIAS_PF'
    WHEN 'INSCRIPCIONES_ARCA'         THEN 'INSCRIPCIONES'
    ELSE upper(replace(btrim(fh.servicio), ' ', '_'))
  END AS tipo_servicio
FROM facturacion_historica fh
WHERE fh.fecha_liquidacion IS NOT NULL
  AND upper(btrim(COALESCE(fh.servicio, ''))) <> 'SALDO INICIAL';

-- ── Ingresos por mes, histórico + real ────────────────────────
-- Mismas columnas que v_ingresos_mensuales para que el service las
-- consuma igual.

CREATE OR REPLACE VIEW v_ingresos_mensuales_con_historico AS
WITH unificado AS (
  SELECT
    l.fecha_liquidacion,
    l.importe_liquidado,
    COALESCE(l.importe_facturado, l.importe_liquidado) AS importe_facturado,
    l.tipo_comprobante
  FROM liquidaciones l
  WHERE l.estado <> 'ANULADA'
    AND l.tipo_liquidacion = 'NORMAL'

  UNION ALL

  SELECT
    h.fecha_liquidacion,
    h.importe_liquidado,
    COALESCE(h.importe_facturado, h.importe_liquidado),
    h.tipo_comprobante
  FROM v_facturacion_historica_normalizada h
)
SELECT
  DATE_TRUNC('month', fecha_liquidacion::TIMESTAMPTZ)::DATE AS mes,
  COUNT(*) AS cantidad_liquidaciones,
  COALESCE(SUM(importe_liquidado), 0) AS total_liquidado,
  COALESCE(SUM(importe_facturado), 0) AS total_facturado,
  COALESCE(SUM(importe_liquidado)
    FILTER (WHERE tipo_comprobante IN ('FC_C', 'PRESUPUESTO')), 0) AS ingreso_base_negro,
  COALESCE(SUM(importe_liquidado)
    FILTER (WHERE tipo_comprobante IN ('FC_A', 'FC_B')), 0) AS facturado_cliente_neto,
  COALESCE(SUM(importe_facturado - importe_liquidado)
    FILTER (WHERE tipo_comprobante IN ('FC_A', 'FC_B')), 0) AS iva_facturado
FROM unificado
GROUP BY 1
ORDER BY 1 DESC;

-- ── Ingresos por tipo de servicio y mes, histórico + real ─────

CREATE OR REPLACE VIEW v_ingresos_por_tipo_mes_con_historico AS
WITH unificado AS (
  SELECT
    l.fecha_liquidacion,
    l.tipo_servicio,
    l.importe_liquidado,
    COALESCE(l.importe_facturado, l.importe_liquidado) AS importe_facturado
  FROM liquidaciones l
  WHERE l.estado <> 'ANULADA'
    AND l.tipo_liquidacion = 'NORMAL'

  UNION ALL

  SELECT
    h.fecha_liquidacion,
    h.tipo_servicio,
    h.importe_liquidado,
    COALESCE(h.importe_facturado, h.importe_liquidado)
  FROM v_facturacion_historica_normalizada h
)
SELECT
  DATE_TRUNC('month', fecha_liquidacion::TIMESTAMPTZ)::DATE AS mes,
  tipo_servicio,
  COUNT(*) AS cantidad,
  COALESCE(SUM(importe_liquidado), 0) AS total_liquidado,
  COALESCE(SUM(importe_facturado), 0) AS total_facturado
FROM unificado
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
