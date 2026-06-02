-- Subfase 2.2: Fondos y Cheques
-- Tablas: fondos_movimientos
-- Views: v_saldo_fondos
-- RLS: solo admin

CREATE TABLE fondos_movimientos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_movimiento  TEXT NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO', 'MOVIMIENTO')),
  fecha            DATE NOT NULL,
  concepto         TEXT NOT NULL,
  nro_comprobante  TEXT,
  cuenta_bancaria  TEXT,
  importe_banco    NUMERIC(14,2) DEFAULT 0,
  importe_efectivo NUMERIC(14,2) DEFAULT 0,
  importe_usd      NUMERIC(14,2) DEFAULT 0,
  cheque_id        UUID REFERENCES cheques(id),
  referencia_tipo  TEXT,
  referencia_id    UUID,
  created_by       UUID REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fondos_fecha ON fondos_movimientos(fecha);
CREATE INDEX idx_fondos_tipo  ON fondos_movimientos(tipo_movimiento);

ALTER TABLE fondos_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fondos_solo_admin" ON fondos_movimientos FOR ALL USING (is_admin());

-- View: saldo de fondos
CREATE OR REPLACE VIEW v_saldo_fondos AS
SELECT
  COALESCE(SUM(importe_banco)     FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_banco)   FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_banco,
  COALESCE(SUM(importe_efectivo)  FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_efectivo) FILTER (WHERE tipo_movimiento = 'EGRESO'), 0)  AS saldo_efectivo,
  COALESCE(SUM(importe_usd)       FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_usd)     FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_usd
FROM fondos_movimientos;
