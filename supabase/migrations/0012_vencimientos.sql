-- Subfase 2.4: Vencimientos
-- RLS: vencimientos 'PERSONAL' solo admin, resto para todos autenticados

CREATE TABLE vencimientos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID REFERENCES clientes(id),
  empleada_id       UUID REFERENCES empleadas(id),
  tipo_vencimiento  TEXT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  descripcion       TEXT NOT NULL,
  completado        BOOLEAN NOT NULL DEFAULT FALSE,
  completado_at     TIMESTAMPTZ,
  completado_by     UUID REFERENCES usuarios(id),
  ambito            TEXT NOT NULL DEFAULT 'CLIENTE'
                      CHECK (ambito IN ('CLIENTE', 'ESTUDIO', 'PERSONAL')),
  notas             TEXT,
  created_by        UUID REFERENCES usuarios(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vencimientos_fecha      ON vencimientos(fecha_vencimiento);
CREATE INDEX idx_vencimientos_cliente    ON vencimientos(cliente_id);
CREATE INDEX idx_vencimientos_empleada   ON vencimientos(empleada_id);
CREATE INDEX idx_vencimientos_pendientes ON vencimientos(completado) WHERE completado = FALSE;

ALTER TABLE vencimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vencimientos_read" ON vencimientos
  FOR SELECT USING (
    is_authenticated_user() AND (ambito != 'PERSONAL' OR is_admin())
  );

CREATE POLICY "vencimientos_insert" ON vencimientos
  FOR INSERT WITH CHECK (is_authenticated_user());

CREATE POLICY "vencimientos_update" ON vencimientos
  FOR UPDATE USING (
    is_authenticated_user() AND (ambito != 'PERSONAL' OR is_admin())
  );

CREATE POLICY "vencimientos_delete" ON vencimientos
  FOR DELETE USING (is_admin());
