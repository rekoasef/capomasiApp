-- Notas simples que Paola (admin) le asigna a una empleada puntual.
-- La empleada las ve en su portal y marca como finalizada la que resolvió;
-- al finalizar desaparece de su vista activa y queda en su historial (trazabilidad).
-- Pedido de Paola, 2026-08-14.

CREATE TABLE notas_empleadas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id   UUID NOT NULL REFERENCES empleadas(id),
  contenido     TEXT NOT NULL CHECK (char_length(trim(contenido)) > 0),
  creada_por    UUID REFERENCES usuarios(id) DEFAULT auth.uid(),
  finalizada    BOOLEAN NOT NULL DEFAULT FALSE,
  finalizada_at TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notas_empleadas_finalizada_chk CHECK (
    (finalizada = FALSE AND finalizada_at IS NULL) OR
    (finalizada = TRUE  AND finalizada_at IS NOT NULL)
  )
);

CREATE INDEX idx_notas_empleadas_empleada ON notas_empleadas(empleada_id, finalizada) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_notas_empleadas_updated_at
  BEFORE UPDATE ON notas_empleadas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE notas_empleadas ENABLE ROW LEVEL SECURITY;

-- Admin: control total (crear, editar, soft-delete via update de deleted_at, leer todo)
CREATE POLICY "notas_empleadas_admin_all" ON notas_empleadas
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Empleada: solo lectura de sus propias notas no borradas (activas + su historial)
CREATE POLICY "notas_empleadas_select_propia" ON notas_empleadas
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM empleadas e
      WHERE e.id = notas_empleadas.empleada_id
        AND e.usuario_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  );

-- Sin policy de INSERT/UPDATE/DELETE directa para no-admin: la empleada finaliza
-- su nota exclusivamente vía la función SECURITY DEFINER de abajo, que no permite
-- tocar contenido ni ningún otro campo.
CREATE OR REPLACE FUNCTION fn_finalizar_nota_empleada(p_nota_id UUID)
RETURNS notas_empleadas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nota notas_empleadas;
BEGIN
  UPDATE notas_empleadas n
     SET finalizada = TRUE, finalizada_at = NOW()
   WHERE n.id = p_nota_id
     AND n.deleted_at IS NULL
     AND n.finalizada = FALSE
     AND EXISTS (
       SELECT 1 FROM empleadas e
       WHERE e.id = n.empleada_id AND e.usuario_id = auth.uid() AND e.deleted_at IS NULL
     )
   RETURNING * INTO v_nota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota no encontrada o no pertenece al usuario';
  END IF;

  RETURN v_nota;
END;
$$;
