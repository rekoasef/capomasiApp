-- ============================================================
-- 0078_comparativo_empleada_con_historico.sql
--
-- Completa la 0077: faltaba el comparativo de ingresos por
-- empleada, que quedó pendiente porque el Excel guarda quién
-- generó el trabajo como texto libre y 10 filas tienen dos
-- personas ("LUCIANA + VICTORIA" ×8, "PAOLA + VICTORIA" ×2).
--
-- Decisión de Renzo (2026-09-09): las compartidas van mitad y
-- mitad. El importe de esas filas se divide por la cantidad de
-- personas nombradas; la cantidad de trabajos suma 1 a cada una,
-- porque las dos participaron. Por eso la suma de "cantidad"
-- puede superar la cantidad de facturas cuando hubo trabajo
-- compartido — el dinero no se duplica, el conteo cuenta
-- participaciones.
--
-- OJO CON LOS NOMBRES: empleadas.nombre viene con espacios al
-- final en la base real ('LUCIANA ', 'VICTORIA ') y el Excel
-- escribe a veces en minúscula ('luciana', 'paola'). La vista
-- vieja agrupa por el nombre crudo, así que sin normalizar
-- Luciana aparecería dos veces en el mismo reporte: una fila por
-- el sistema y otra por el Excel. Se normaliza con upper(btrim())
-- en los dos lados.
-- ============================================================

-- ── generado_por en la vista normalizada ──────────────────────
-- CREATE OR REPLACE VIEW solo permite agregar columnas al final,
-- por eso generado_por va último.

CREATE OR REPLACE VIEW v_facturacion_historica_normalizada AS
SELECT
  fh.fecha_liquidacion,
  fh.importe_liquidado,
  fh.importe_facturado,
  CASE upper(btrim(fh.comprobante_tipo))
    WHEN 'FC A'        THEN 'FC_A'
    WHEN 'NC A'        THEN 'FC_A'
    WHEN 'FC B'        THEN 'FC_B'
    WHEN 'FC C'        THEN 'FC_C'
    WHEN 'PRESUPUESTO' THEN 'PRESUPUESTO'
    ELSE NULL
  END AS tipo_comprobante,
  CASE upper(replace(btrim(fh.servicio), ' ', '_'))
    WHEN 'RECUPERO_GASTOS'            THEN 'RECUPERO_DE_GASTOS'
    WHEN 'CONSULTORIA_COSTOS_MENSUAL' THEN 'CONSULTORIA_COSTOS'
    WHEN 'GANANCIA_PERSONA_FISICA'    THEN 'GANANCIAS_PF'
    WHEN 'INSCRIPCIONES_ARCA'         THEN 'INSCRIPCIONES'
    ELSE upper(replace(btrim(fh.servicio), ' ', '_'))
  END AS tipo_servicio,
  fh.generado_por
FROM facturacion_historica fh
WHERE fh.fecha_liquidacion IS NOT NULL
  AND upper(btrim(COALESCE(fh.servicio, ''))) <> 'SALDO INICIAL';

-- ── Ingresos por empleada y mes, histórico + real ─────────────

CREATE OR REPLACE VIEW v_ingresos_por_empleada_mes_con_historico AS
WITH liq_empleada AS (
  -- Igual que en v_ingresos_por_empleada_mes: la empleada sale del
  -- vencimiento que originó la liquidación, si hay uno.
  SELECT DISTINCT ON (v.liquidacion_id)
    v.liquidacion_id,
    e.nombre AS empleada_nombre
  FROM vencimientos v
  JOIN empleadas e ON e.id = v.empleada_id
  WHERE v.liquidacion_id IS NOT NULL
  ORDER BY v.liquidacion_id, v.fecha_vencimiento
),
reales AS (
  SELECT
    l.fecha_liquidacion,
    upper(btrim(COALESCE(le.empleada_nombre, l.generado_por, 'Sin asignar'))) AS empleada,
    1::BIGINT       AS cantidad,
    l.importe_liquidado
  FROM liquidaciones l
  LEFT JOIN liq_empleada le ON le.liquidacion_id = l.id
  WHERE l.estado <> 'ANULADA'
    AND l.tipo_liquidacion = 'NORMAL'
),
-- Una fila por cada persona nombrada, con el importe dividido.
historicas AS (
  SELECT
    h.fecha_liquidacion,
    upper(btrim(parte)) AS empleada,
    1::BIGINT           AS cantidad,
    h.importe_liquidado / GREATEST(array_length(string_to_array(COALESCE(h.generado_por, 'Sin asignar'), '+'), 1), 1) AS importe_liquidado
  FROM v_facturacion_historica_normalizada h
  CROSS JOIN LATERAL unnest(string_to_array(COALESCE(h.generado_por, 'Sin asignar'), '+')) AS parte
  WHERE btrim(parte) <> ''
),
unificado AS (
  SELECT * FROM reales
  UNION ALL
  SELECT * FROM historicas
)
SELECT
  DATE_TRUNC('month', fecha_liquidacion::TIMESTAMPTZ)::DATE AS mes,
  empleada,
  SUM(cantidad) AS cantidad,
  COALESCE(SUM(importe_liquidado), 0) AS total_liquidado
FROM unificado
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
