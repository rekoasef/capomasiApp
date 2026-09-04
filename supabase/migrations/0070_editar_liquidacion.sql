-- ============================================================
-- 0070_editar_liquidacion.sql
-- Paola, 2026-09-04: "y modificar los presupuestos hechos, porque solo permite
-- eliminarlos". Un presupuesto es una liquidación con tipo_comprobante =
-- 'PRESUPUESTO', así que lo que falta es poder editar la liquidación: hasta ahora
-- lo único que se podía hacer era anularla y cargarla de nuevo.
--
-- Se habilita para cualquier liquidación (no solo presupuestos): equivocarse
-- cargando una factura es igual de probable y hoy la única salida es anularla.
-- Solo admin, nunca una anulada, y el total facturado no puede quedar por debajo
-- de lo que ya se le cobró — para eso primero hay que desimputar los recibos.
--
-- El saldo inicial queda afuera: se edita desde su propio botón (0067/0068), que
-- además controla que sea uno solo por cliente.
-- ============================================================

-- ── 1. Numerar el presupuesto también al editar ───────────────
-- Antes solo se numeraba en el INSERT; ahora una liquidación que pasa a ser
-- presupuesto en una edición también recibe su P-XXXX.
CREATE OR REPLACE FUNCTION fn_liquidacion_auto_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo_comprobante = 'PRESUPUESTO'
     AND (NEW.nro_comprobante IS NULL OR NEW.nro_comprobante = '')
  THEN
    NEW.nro_comprobante := 'P-' || LPAD(nextval('seq_presupuesto')::TEXT, 4, '0');
  END IF;

  IF NEW.importe_liquidado IS NOT NULL THEN
    NEW.importe_facturado := fn_calcular_importe_facturado(
      NEW.importe_liquidado,
      NEW.tipo_comprobante
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. Edición de la liquidación ──────────────────────────────
CREATE OR REPLACE FUNCTION fn_editar_liquidacion(
  p_id               UUID,
  p_tipo_servicio    TEXT,
  p_fecha            DATE,
  p_importe          NUMERIC,
  p_generado_por     TEXT DEFAULT NULL,
  p_periodo_mes      TEXT DEFAULT NULL,
  p_periodo_anio     INT DEFAULT NULL,
  p_detalle          TEXT DEFAULT NULL,
  p_tipo_comprobante TEXT DEFAULT NULL,
  p_nro_comprobante  TEXT DEFAULT NULL,
  p_notas            TEXT DEFAULT NULL
)
RETURNS liquidaciones
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_liq        liquidaciones;
  v_imputado   NUMERIC(14,2);
  v_facturado  NUMERIC(14,2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede editar liquidaciones';
  END IF;

  SELECT * INTO v_liq FROM liquidaciones WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Liquidación no encontrada';
  END IF;
  IF v_liq.estado = 'ANULADA' THEN
    RAISE EXCEPTION 'La liquidación está anulada: no se puede editar';
  END IF;
  IF v_liq.tipo_liquidacion = 'SALDO_INICIAL' THEN
    RAISE EXCEPTION 'El saldo inicial se edita desde el botón "Saldo inicial" de la cuenta corriente';
  END IF;
  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser mayor a 0';
  END IF;

  SELECT COALESCE(SUM(i.importe), 0) INTO v_imputado
    FROM imputaciones i
    JOIN recibos r ON r.id = i.recibo_id
   WHERE i.liquidacion_id = v_liq.id
     AND r.anulado = FALSE;

  v_facturado := fn_calcular_importe_facturado(p_importe, NULLIF(p_tipo_comprobante, ''));

  IF v_facturado < v_imputado THEN
    RAISE EXCEPTION 'El total a cobrar (%) queda por debajo de lo que ya se cobró (%). Desimputá los recibos antes de bajar el importe',
      v_facturado, v_imputado;
  END IF;

  UPDATE liquidaciones
     SET tipo_servicio     = p_tipo_servicio,
         fecha_liquidacion = p_fecha,
         importe_liquidado = p_importe,
         generado_por      = NULLIF(p_generado_por, ''),
         periodo_mes       = NULLIF(p_periodo_mes, ''),
         periodo_anio      = p_periodo_anio,
         detalle           = NULLIF(p_detalle, ''),
         tipo_comprobante  = NULLIF(p_tipo_comprobante, ''),
         nro_comprobante   = NULLIF(p_nro_comprobante, ''),
         notas             = NULLIF(p_notas, '')
   WHERE id = p_id;

  -- El importe pudo cambiar: PENDIENTE / PARCIALMENTE_COBRADA / COBRADA puede haber quedado viejo
  PERFORM fn_recalcular_estado_liquidacion(p_id);

  SELECT * INTO v_liq FROM liquidaciones WHERE id = p_id;
  RETURN v_liq;
END;
$$;
