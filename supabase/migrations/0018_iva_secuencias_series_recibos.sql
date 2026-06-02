-- ============================================================
-- 0018_iva_secuencias_series_recibos.sql
-- Implementa el flujo definido en docs/honorarios-facturacion-recibos.md
--
-- Cambios:
--   1) Secuencias autoincrementales para Presupuestos (P-XXXX) y
--      Recibos series A y C (A-XXXX / C-XXXX). Arrancan en 100.
--   2) Helper fn_calcular_importe_facturado: FC_A => +21% IVA, resto igual.
--   3) Helper fn_serie_recibo_de_tipo_comprobante: FC_A => 'A', resto => 'C'.
--   4) Trigger BEFORE INSERT/UPDATE en liquidaciones:
--      - Auto-numera Presupuestos (si nro_comprobante es NULL).
--      - Auto-calcula importe_facturado a partir de importe_liquidado
--        y tipo_comprobante.
--   5) Refactor de fn_registrar_recibo:
--      - Acepta p_vuelto_efectivo (caso especial cheque con vuelto).
--      - Detecta serie de cada imputación (según tipo_comprobante de la
--        liquidación). Si hay imputaciones de ambas series, crea 2 recibos
--        separados (auto-split). Si hay vuelto en efectivo, el cheque va
--        al recibo A y el vuelto al recibo C (efectivo).
--      - Numera los recibos automáticamente con la serie correspondiente.
--      - Retorna JSONB con el array de recibos creados.
-- ============================================================

-- ============================================================
-- 1) Secuencias (arrancan en 100 → primer número emitido = 100)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS seq_presupuesto START WITH 100 MINVALUE 100;
CREATE SEQUENCE IF NOT EXISTS seq_recibo_a    START WITH 100 MINVALUE 100;
CREATE SEQUENCE IF NOT EXISTS seq_recibo_c    START WITH 100 MINVALUE 100;

-- ============================================================
-- 2) Helper: importe facturado a partir de importe liquidado + tipo
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_importe_facturado(
  p_importe_liquidado NUMERIC,
  p_tipo_comprobante  TEXT
)
RETURNS NUMERIC(14,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_importe_liquidado IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_tipo_comprobante = 'FC_A' THEN
    RETURN ROUND(p_importe_liquidado * 1.21, 2);
  END IF;
  RETURN ROUND(p_importe_liquidado, 2);
END;
$$;

-- ============================================================
-- 3) Helper: serie de recibo según el tipo de comprobante
-- ============================================================
CREATE OR REPLACE FUNCTION fn_serie_recibo_de_tipo_comprobante(p_tipo_comprobante TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_tipo_comprobante = 'FC_A' THEN
    RETURN 'A';
  END IF;
  -- FC_C, PRESUPUESTO, FC_B, ND, NC, NULL → serie C (uso general)
  RETURN 'C';
END;
$$;

-- ============================================================
-- 4) Trigger en liquidaciones: auto-numerar presupuesto + IVA
-- ============================================================
CREATE OR REPLACE FUNCTION fn_liquidacion_auto_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-numerar presupuesto solo en INSERT (no re-asignar en UPDATE)
  IF TG_OP = 'INSERT'
     AND NEW.tipo_comprobante = 'PRESUPUESTO'
     AND (NEW.nro_comprobante IS NULL OR NEW.nro_comprobante = '')
  THEN
    NEW.nro_comprobante := 'P-' || LPAD(nextval('seq_presupuesto')::TEXT, 4, '0');
  END IF;

  -- Auto-calcular importe_facturado (siempre — INSERT y UPDATE)
  IF NEW.importe_liquidado IS NOT NULL THEN
    NEW.importe_facturado := fn_calcular_importe_facturado(
      NEW.importe_liquidado,
      NEW.tipo_comprobante
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_liquidacion_auto_fields ON liquidaciones;
CREATE TRIGGER trigger_liquidacion_auto_fields
  BEFORE INSERT OR UPDATE ON liquidaciones
  FOR EACH ROW
  EXECUTE FUNCTION fn_liquidacion_auto_fields();

-- Backfill: actualizar importe_facturado existente según las nuevas reglas
UPDATE liquidaciones
   SET importe_facturado = fn_calcular_importe_facturado(importe_liquidado, tipo_comprobante)
 WHERE importe_liquidado IS NOT NULL;

-- ============================================================
-- 5) Refactor: fn_registrar_recibo con auto-split por serie
-- ============================================================
DROP FUNCTION IF EXISTS fn_registrar_recibo(
  UUID, DATE, TEXT, NUMERIC, JSONB, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT
);

CREATE OR REPLACE FUNCTION fn_registrar_recibo(
  p_cliente_id      UUID,
  p_fecha           DATE,
  p_tipo_pago       TEXT,
  p_importe         NUMERIC,
  p_imputaciones    JSONB    DEFAULT '[]'::jsonb,
  p_numero_recibo   TEXT     DEFAULT NULL,
  p_importe_usd     NUMERIC  DEFAULT NULL,
  p_tipo_cambio     NUMERIC  DEFAULT NULL,
  p_cuenta_bancaria TEXT     DEFAULT NULL,
  p_cheque_id       UUID     DEFAULT NULL,
  p_notas           TEXT     DEFAULT NULL,
  p_vuelto_efectivo NUMERIC  DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo_a            recibos;
  v_recibo_c            recibos;
  v_recibos_creados     JSONB := '[]'::JSONB;
  v_imp                 JSONB;
  v_imp_importe         NUMERIC(14,2);
  v_liq_id              UUID;
  v_liq                 liquidaciones;
  v_serie               TEXT;
  v_imps_a              JSONB := '[]'::JSONB;
  v_imps_c              JSONB := '[]'::JSONB;
  v_total_imp_a         NUMERIC(14,2) := 0;
  v_total_imp_c         NUMERIC(14,2) := 0;
  v_importe_recibo_a    NUMERIC(14,2) := 0;
  v_importe_recibo_c    NUMERIC(14,2) := 0;
  v_vuelto              NUMERIC(14,2) := COALESCE(p_vuelto_efectivo, 0);
  v_numero_a            TEXT;
  v_numero_c            TEXT;
  v_tipo_pago_a         TEXT := p_tipo_pago;
  v_tipo_pago_c         TEXT := p_tipo_pago;
  v_cuenta_a            TEXT := p_cuenta_bancaria;
  v_cuenta_c            TEXT := p_cuenta_bancaria;
  v_cheque_a            UUID := p_cheque_id;
  v_cheque_c            UUID := p_cheque_id;
BEGIN
  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'Importe del recibo inválido';
  END IF;
  IF v_vuelto < 0 THEN
    RAISE EXCEPTION 'Vuelto en efectivo inválido';
  END IF;
  IF v_vuelto > 0 AND p_tipo_pago <> 'CHEQUE' THEN
    RAISE EXCEPTION 'El vuelto en efectivo solo aplica a pagos con cheque';
  END IF;

  -- 1) Procesar imputaciones: validar y agrupar por serie
  IF jsonb_array_length(p_imputaciones) > 0 THEN
    FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones) LOOP
      v_liq_id      := (v_imp->>'liquidacion_id')::UUID;
      v_imp_importe := (v_imp->>'importe')::NUMERIC;

      IF v_imp_importe IS NULL OR v_imp_importe <= 0 THEN
        RAISE EXCEPTION 'Importe de imputación inválido';
      END IF;

      SELECT * INTO v_liq FROM liquidaciones WHERE id = v_liq_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Liquidación % no encontrada', v_liq_id;
      END IF;
      IF v_liq.estado = 'ANULADA' THEN
        RAISE EXCEPTION 'No se puede imputar a una liquidación anulada';
      END IF;
      IF v_liq.cliente_id <> p_cliente_id THEN
        RAISE EXCEPTION 'La liquidación no pertenece al cliente del recibo';
      END IF;

      v_serie := fn_serie_recibo_de_tipo_comprobante(v_liq.tipo_comprobante);
      IF v_serie = 'A' THEN
        v_total_imp_a := v_total_imp_a + v_imp_importe;
        v_imps_a := v_imps_a || jsonb_build_array(v_imp);
      ELSE
        v_total_imp_c := v_total_imp_c + v_imp_importe;
        v_imps_c := v_imps_c || jsonb_build_array(v_imp);
      END IF;
    END LOOP;

    IF (v_total_imp_a + v_total_imp_c) > p_importe + 0.001 THEN
      RAISE EXCEPTION 'Las imputaciones (%) superan el importe del recibo (%)',
        v_total_imp_a + v_total_imp_c, p_importe;
    END IF;
  END IF;

  -- 2) Distribuir el importe entre recibo A y recibo C
  IF v_vuelto > 0 THEN
    -- Caso especial: cheque con vuelto en efectivo
    IF v_vuelto >= p_importe THEN
      RAISE EXCEPTION 'El vuelto en efectivo (%) no puede ser mayor o igual al importe del recibo (%)',
        v_vuelto, p_importe;
    END IF;
    v_importe_recibo_a := p_importe - v_vuelto;
    v_importe_recibo_c := v_vuelto;

    IF v_total_imp_a > v_importe_recibo_a + 0.001 THEN
      RAISE EXCEPTION 'Las imputaciones a serie A (%) superan el monto del cheque (%)',
        v_total_imp_a, v_importe_recibo_a;
    END IF;
    IF v_total_imp_c > v_importe_recibo_c + 0.001 THEN
      RAISE EXCEPTION 'Las imputaciones a serie C (%) superan el vuelto en efectivo (%)',
        v_total_imp_c, v_importe_recibo_c;
    END IF;

    -- Cheque va al recibo A; efectivo (vuelto) al recibo C
    v_tipo_pago_a := 'CHEQUE';
    v_tipo_pago_c := 'EFECTIVO';
    v_cuenta_c    := NULL;
    v_cheque_c    := NULL;
  ELSIF jsonb_array_length(v_imps_a) > 0 AND jsonb_array_length(v_imps_c) > 0 THEN
    -- Pago mixto: auto-split. Cada recibo lleva exactamente la suma imputada.
    -- Si sobra saldo no imputado, se asigna al recibo de la serie C (saldo a favor de uso general).
    v_importe_recibo_a := v_total_imp_a;
    v_importe_recibo_c := p_importe - v_total_imp_a;
  ELSIF jsonb_array_length(v_imps_a) > 0 THEN
    -- Solo serie A
    v_importe_recibo_a := p_importe;
  ELSE
    -- Solo serie C (o sin imputaciones → default C)
    v_importe_recibo_c := p_importe;
  END IF;

  -- 3) Insertar recibo serie A (si corresponde)
  IF v_importe_recibo_a > 0 THEN
    v_numero_a := COALESCE(
      NULLIF(p_numero_recibo, ''),
      'A-' || LPAD(nextval('seq_recibo_a')::TEXT, 4, '0')
    );

    INSERT INTO recibos (
      cliente_id, numero_recibo, fecha, tipo_pago, importe,
      importe_usd, tipo_cambio, cuenta_bancaria, cheque_id, notas, created_by
    )
    VALUES (
      p_cliente_id, v_numero_a, p_fecha, v_tipo_pago_a, v_importe_recibo_a,
      p_importe_usd, p_tipo_cambio, v_cuenta_a, v_cheque_a, p_notas, auth.uid()
    )
    RETURNING * INTO v_recibo_a;

    -- Imputaciones serie A
    IF jsonb_array_length(v_imps_a) > 0 THEN
      FOR v_imp IN SELECT * FROM jsonb_array_elements(v_imps_a) LOOP
        v_liq_id := (v_imp->>'liquidacion_id')::UUID;
        INSERT INTO imputaciones (recibo_id, liquidacion_id, importe, created_by)
        VALUES (v_recibo_a.id, v_liq_id, (v_imp->>'importe')::NUMERIC, auth.uid());
        PERFORM fn_recalcular_estado_liquidacion(v_liq_id);
      END LOOP;
    END IF;

    v_recibos_creados := v_recibos_creados || jsonb_build_array(to_jsonb(v_recibo_a));
  END IF;

  -- 4) Insertar recibo serie C (si corresponde)
  IF v_importe_recibo_c > 0 THEN
    -- Siempre auto-numerado para serie C (si el caller pasó un número, ya fue al recibo A)
    v_numero_c := 'C-' || LPAD(nextval('seq_recibo_c')::TEXT, 4, '0');

    INSERT INTO recibos (
      cliente_id, numero_recibo, fecha, tipo_pago, importe,
      importe_usd, tipo_cambio, cuenta_bancaria, cheque_id, notas, created_by
    )
    VALUES (
      p_cliente_id, v_numero_c, p_fecha, v_tipo_pago_c, v_importe_recibo_c,
      p_importe_usd, p_tipo_cambio, v_cuenta_c, v_cheque_c, p_notas, auth.uid()
    )
    RETURNING * INTO v_recibo_c;

    -- Imputaciones serie C
    IF jsonb_array_length(v_imps_c) > 0 THEN
      FOR v_imp IN SELECT * FROM jsonb_array_elements(v_imps_c) LOOP
        v_liq_id := (v_imp->>'liquidacion_id')::UUID;
        INSERT INTO imputaciones (recibo_id, liquidacion_id, importe, created_by)
        VALUES (v_recibo_c.id, v_liq_id, (v_imp->>'importe')::NUMERIC, auth.uid());
        PERFORM fn_recalcular_estado_liquidacion(v_liq_id);
      END LOOP;
    END IF;

    v_recibos_creados := v_recibos_creados || jsonb_build_array(to_jsonb(v_recibo_c));
  END IF;

  RETURN v_recibos_creados;
END;
$$;
