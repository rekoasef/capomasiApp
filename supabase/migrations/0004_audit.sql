-- Tabla de auditoría
CREATE TABLE audit_log (
  id             BIGSERIAL PRIMARY KEY,
  usuario_id     UUID REFERENCES usuarios(id),
  tabla_afectada TEXT NOT NULL,
  registro_id    UUID NOT NULL,
  accion         TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  ip_address     INET,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tabla   ON audit_log(tabla_afectada, registro_id);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_fecha   ON audit_log(created_at);

-- RLS: solo admin puede leer el audit log; nadie puede modificarlo directamente
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_read_admin" ON audit_log
  FOR SELECT USING (is_admin());

-- Función genérica de auditoría (se aplica en tablas sensibles)
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(usuario_id, tabla_afectada, registro_id, accion, valor_nuevo)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(usuario_id, tabla_afectada, registro_id, accion, valor_anterior, valor_nuevo)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(usuario_id, tabla_afectada, registro_id, accion, valor_anterior)
    VALUES (auth.uid(), TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
