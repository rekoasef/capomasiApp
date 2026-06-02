-- Subfase 2.1: Empleadas + Liquidación Personal
-- Tablas: empleadas, liquidaciones_empleadas, pagos_empleadas
-- RLS: solo admin

-- empleadas
CREATE TABLE empleadas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID REFERENCES usuarios(id),
  nombre        TEXT NOT NULL,
  tipo_relacion TEXT NOT NULL CHECK (tipo_relacion IN ('DEPENDENCIA', 'POR_HORA')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empleadas_read"  ON empleadas FOR SELECT USING (is_authenticated_user());
CREATE POLICY "empleadas_write" ON empleadas FOR ALL    USING (is_admin());

-- liquidaciones_empleadas
CREATE TABLE liquidaciones_empleadas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id   UUID NOT NULL REFERENCES empleadas(id),
  concepto      TEXT NOT NULL,
  tipo_concepto TEXT NOT NULL CHECK (tipo_concepto IN ('HABER', 'DESCUENTO')),
  periodo_mes   INT  NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio  INT  NOT NULL,
  importe       NUMERIC(14,2) NOT NULL,
  observaciones TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liq_emp_empleada ON liquidaciones_empleadas(empleada_id);
CREATE INDEX idx_liq_emp_periodo  ON liquidaciones_empleadas(periodo_anio, periodo_mes);

ALTER TABLE liquidaciones_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liq_emp_solo_admin" ON liquidaciones_empleadas FOR ALL USING (is_admin());

-- pagos_empleadas
CREATE TABLE pagos_empleadas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id     UUID NOT NULL REFERENCES empleadas(id),
  periodo_mes     INT  NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio    INT  NOT NULL,
  tipo_pago       TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE')),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_pago      DATE NOT NULL,
  cuenta_bancaria TEXT,
  cheque_id       UUID REFERENCES cheques(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_emp_empleada ON pagos_empleadas(empleada_id);
CREATE INDEX idx_pagos_emp_periodo  ON pagos_empleadas(periodo_anio, periodo_mes);

ALTER TABLE pagos_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_emp_solo_admin" ON pagos_empleadas FOR ALL USING (is_admin());
