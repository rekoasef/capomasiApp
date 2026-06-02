-- ============================================================
-- 0008_cobranzas.sql
-- Tablas: cheques, liquidaciones, pagos
-- View:   v_cuenta_corriente
-- ============================================================

-- cheques (referencia a proveedores se agrega en 0011_proveedores.sql)
CREATE TABLE cheques (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('PROPIO','TERCERO')),
  numero          TEXT NOT NULL,
  banco           TEXT NOT NULL,
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_emision   DATE NOT NULL,
  fecha_cobro     DATE,
  estado          TEXT NOT NULL DEFAULT 'EN_CARTERA'
                    CHECK (estado IN ('EN_CARTERA','DEPOSITADO','ENDOSADO','RECHAZADO','ANULADO')),
  origen          TEXT NOT NULL CHECK (origen IN ('CLIENTE','EMITIDO')),
  cliente_id      UUID REFERENCES clientes(id),
  proveedor_id    UUID,  -- FK a proveedores se agrega en 0011
  cuenta_bancaria TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cheques_estado   ON cheques(estado);
CREATE INDEX idx_cheques_fecha    ON cheques(fecha_cobro);
CREATE INDEX idx_cheques_cliente  ON cheques(cliente_id);

ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
-- Todos leen / admin edita
CREATE POLICY "cheques_read"  ON cheques FOR SELECT USING (is_authenticated_user());
CREATE POLICY "cheques_write" ON cheques FOR ALL    USING (is_admin());

-- ============================================================

CREATE TABLE liquidaciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id),
  tipo_servicio       TEXT NOT NULL,
  generado_por        TEXT,
  fecha_liquidacion   DATE NOT NULL,
  periodo_mes         TEXT,
  periodo_anio        INT,
  detalle             TEXT,
  importe_liquidado   NUMERIC(14,2) NOT NULL,
  tipo_comprobante    TEXT,
  nro_comprobante     TEXT,
  importe_facturado   NUMERIC(14,2),
  estado              TEXT NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN ('PENDIENTE','PARCIALMENTE_COBRADA','COBRADA','ANULADA')),
  tipo_liquidacion    TEXT NOT NULL DEFAULT 'NORMAL'
                        CHECK (tipo_liquidacion IN ('NORMAL','SALDO_INICIAL')),
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liquidaciones_cliente  ON liquidaciones(cliente_id);
CREATE INDEX idx_liquidaciones_fecha    ON liquidaciones(fecha_liquidacion);
CREATE INDEX idx_liquidaciones_estado   ON liquidaciones(estado);
CREATE INDEX idx_liquidaciones_periodo  ON liquidaciones(periodo_anio, periodo_mes);

ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liquidaciones_read"   ON liquidaciones FOR SELECT USING (is_authenticated_user());
CREATE POLICY "liquidaciones_insert" ON liquidaciones FOR INSERT WITH CHECK (is_authenticated_user());
CREATE POLICY "liquidaciones_update" ON liquidaciones FOR UPDATE USING (is_admin());
CREATE POLICY "liquidaciones_delete" ON liquidaciones FOR DELETE USING (is_admin());

CREATE TRIGGER audit_liquidaciones
  AFTER INSERT OR UPDATE OR DELETE ON liquidaciones
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================

CREATE TABLE pagos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id  UUID NOT NULL REFERENCES liquidaciones(id),
  tipo_pago       TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE','USD')),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  importe_usd     NUMERIC(14,2),
  tipo_cambio     NUMERIC(10,4),
  fecha_pago      DATE NOT NULL,
  cuenta_bancaria TEXT,
  cheque_id       UUID REFERENCES cheques(id),
  notas           TEXT,
  created_by      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_liquidacion ON pagos(liquidacion_id);
CREATE INDEX idx_pagos_fecha       ON pagos(fecha_pago);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_read"   ON pagos FOR SELECT USING (is_authenticated_user());
CREATE POLICY "pagos_insert" ON pagos FOR INSERT WITH CHECK (is_authenticated_user());
CREATE POLICY "pagos_delete" ON pagos FOR DELETE USING (is_admin());

CREATE TRIGGER audit_pagos
  AFTER INSERT OR UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================
-- Función RPC: registrar pago y actualizar estado liquidación
-- ============================================================
CREATE OR REPLACE FUNCTION fn_registrar_pago(
  p_liquidacion_id  UUID,
  p_tipo_pago       TEXT,
  p_importe         NUMERIC,
  p_fecha_pago      DATE,
  p_importe_usd     NUMERIC DEFAULT NULL,
  p_tipo_cambio     NUMERIC DEFAULT NULL,
  p_cuenta_bancaria TEXT    DEFAULT NULL,
  p_notas           TEXT    DEFAULT NULL
)
RETURNS pagos
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_liq         liquidaciones;
  v_total_pagado NUMERIC;
  v_nuevo_estado TEXT;
  v_pago        pagos;
BEGIN
  SELECT * INTO v_liq FROM liquidaciones WHERE id = p_liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Liquidación no encontrada';
  END IF;
  IF v_liq.estado = 'ANULADA' THEN
    RAISE EXCEPTION 'No se puede pagar una liquidación anulada';
  END IF;
  IF v_liq.estado = 'COBRADA' THEN
    RAISE EXCEPTION 'La liquidación ya está cobrada';
  END IF;

  INSERT INTO pagos (
    liquidacion_id, tipo_pago, importe, importe_usd, tipo_cambio,
    fecha_pago, cuenta_bancaria, notas, created_by
  )
  VALUES (
    p_liquidacion_id, p_tipo_pago, p_importe, p_importe_usd, p_tipo_cambio,
    p_fecha_pago, p_cuenta_bancaria, p_notas, auth.uid()
  )
  RETURNING * INTO v_pago;

  SELECT COALESCE(SUM(importe), 0) INTO v_total_pagado
  FROM pagos WHERE liquidacion_id = p_liquidacion_id;

  IF v_total_pagado >= v_liq.importe_liquidado THEN
    v_nuevo_estado := 'COBRADA';
  ELSE
    v_nuevo_estado := 'PARCIALMENTE_COBRADA';
  END IF;

  UPDATE liquidaciones
  SET estado = v_nuevo_estado, updated_at = NOW()
  WHERE id = p_liquidacion_id;

  RETURN v_pago;
END;
$$;

-- ============================================================
-- View: cuenta corriente por cliente
-- ============================================================
CREATE OR REPLACE VIEW v_cuenta_corriente AS
SELECT
  c.id                                          AS cliente_id,
  c.nombre                                      AS cliente_nombre,
  COALESCE(SUM(l.importe_liquidado), 0)         AS total_devengado,
  COALESCE(SUM(p.importe), 0)                   AS total_cobrado,
  COALESCE(SUM(l.importe_liquidado), 0)
    - COALESCE(SUM(p.importe), 0)               AS saldo_pendiente,
  COUNT(l.id) FILTER (
    WHERE l.estado IN ('PENDIENTE', 'PARCIALMENTE_COBRADA')
  )                                             AS liquidaciones_pendientes
FROM clientes c
LEFT JOIN liquidaciones l ON l.cliente_id = c.id AND l.estado != 'ANULADA'
LEFT JOIN pagos p ON p.liquidacion_id = l.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.nombre;
