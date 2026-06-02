-- ============================================================
-- 0007_honorarios.sql
-- Honorarios mensuales + Trabajos anuales (honorarios_anuales)
-- ============================================================

-- ── honorarios_mensuales ────────────────────────────────────
CREATE TABLE honorarios_mensuales (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             UUID         NOT NULL REFERENCES clientes(id),
  monto                  NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  frecuencia_ajuste_meses INT          NOT NULL DEFAULT 2,
  vigente_desde          DATE         NOT NULL,
  vigente_hasta          DATE,
  porcentaje_ajuste      NUMERIC(8,4),
  notas                  TEXT,
  creado_por             UUID         REFERENCES usuarios(id),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_honorarios_activo
  ON honorarios_mensuales(cliente_id)
  WHERE vigente_hasta IS NULL;

CREATE INDEX idx_honorarios_cliente  ON honorarios_mensuales(cliente_id);
CREATE INDEX idx_honorarios_vigencia ON honorarios_mensuales(vigente_desde, vigente_hasta);

ALTER TABLE honorarios_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY honorarios_read ON honorarios_mensuales
  FOR SELECT USING (is_authenticated_user());

CREATE POLICY honorarios_write_admin ON honorarios_mensuales
  FOR ALL USING (is_admin());

CREATE TRIGGER audit_honorarios_mensuales
  AFTER INSERT OR UPDATE OR DELETE ON honorarios_mensuales
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ── honorarios_anuales ──────────────────────────────────────
CREATE TABLE honorarios_anuales (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID         NOT NULL REFERENCES clientes(id),
  tipo_trabajo TEXT        NOT NULL,
  anio        INT          NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
  honorario   NUMERIC(14,2) CHECK (honorario >= 0),
  estado      TEXT         NOT NULL DEFAULT 'PENDIENTE'
                CHECK (estado IN ('PENDIENTE','EN_PROCESO','FINALIZADO','COBRADO')),
  asignado_a  UUID         REFERENCES usuarios(id),
  notas       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hon_anuales_cliente ON honorarios_anuales(cliente_id);
CREATE INDEX idx_hon_anuales_anio    ON honorarios_anuales(anio);
CREATE INDEX idx_hon_anuales_estado  ON honorarios_anuales(estado);

ALTER TABLE honorarios_anuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY hon_anuales_read ON honorarios_anuales
  FOR SELECT USING (is_authenticated_user());

CREATE POLICY hon_anuales_write ON honorarios_anuales
  FOR ALL USING (is_authenticated_user());
