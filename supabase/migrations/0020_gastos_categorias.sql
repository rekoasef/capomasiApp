-- Gestor de gastos de Paola
-- Categorías libres, gastos recurrentes mensuales y pagos únicos/recurrentes.

CREATE TABLE categorias_gastos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL UNIQUE,
  color       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES usuarios(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gastos_recurrentes (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id               UUID NOT NULL REFERENCES categorias_gastos(id),
  descripcion                TEXT NOT NULL,
  dia_vencimiento            INT NOT NULL CHECK (dia_vencimiento BETWEEN 1 AND 31),
  proxima_fecha_vencimiento  DATE NOT NULL,
  activo                     BOOLEAN NOT NULL DEFAULT TRUE,
  notas                      TEXT,
  created_by                 UUID REFERENCES usuarios(id) DEFAULT auth.uid(),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pagos_gastos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id             UUID NOT NULL REFERENCES categorias_gastos(id),
  gasto_recurrente_id      UUID REFERENCES gastos_recurrentes(id),
  concepto                 TEXT NOT NULL,
  fecha_pago               DATE NOT NULL,
  medio_pago               TEXT NOT NULL CHECK (medio_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE','TARJETA')),
  importe                  NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_vencimiento_pagado DATE,
  comprobante_url          TEXT,
  notas                    TEXT,
  created_by               UUID REFERENCES usuarios(id) DEFAULT auth.uid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categorias_gastos_activo ON categorias_gastos(activo);

CREATE INDEX idx_gastos_recurrentes_categoria ON gastos_recurrentes(categoria_id);
CREATE INDEX idx_gastos_recurrentes_proxima   ON gastos_recurrentes(proxima_fecha_vencimiento);
CREATE INDEX idx_gastos_recurrentes_activos   ON gastos_recurrentes(activo) WHERE activo = TRUE;

CREATE INDEX idx_pagos_gastos_categoria        ON pagos_gastos(categoria_id);
CREATE INDEX idx_pagos_gastos_recurrente       ON pagos_gastos(gasto_recurrente_id);
CREATE INDEX idx_pagos_gastos_fecha            ON pagos_gastos(fecha_pago);
CREATE INDEX idx_pagos_gastos_fecha_categoria  ON pagos_gastos(fecha_pago, categoria_id);

CREATE OR REPLACE FUNCTION fn_calcular_proxima_fecha_gasto(
  p_dia INT,
  p_desde DATE DEFAULT CURRENT_DATE
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_mes_base DATE;
  v_ultimo_dia INT;
  v_fecha DATE;
BEGIN
  IF p_dia < 1 OR p_dia > 31 THEN
    RAISE EXCEPTION 'Día de vencimiento inválido';
  END IF;

  v_mes_base := date_trunc('month', p_desde)::DATE;
  v_ultimo_dia := EXTRACT(DAY FROM (v_mes_base + INTERVAL '1 month' - INTERVAL '1 day'))::INT;
  v_fecha := make_date(
    EXTRACT(YEAR FROM v_mes_base)::INT,
    EXTRACT(MONTH FROM v_mes_base)::INT,
    LEAST(p_dia, v_ultimo_dia)
  );

  IF v_fecha < p_desde THEN
    v_mes_base := (v_mes_base + INTERVAL '1 month')::DATE;
    v_ultimo_dia := EXTRACT(DAY FROM (v_mes_base + INTERVAL '1 month' - INTERVAL '1 day'))::INT;
    v_fecha := make_date(
      EXTRACT(YEAR FROM v_mes_base)::INT,
      EXTRACT(MONTH FROM v_mes_base)::INT,
      LEAST(p_dia, v_ultimo_dia)
    );
  END IF;

  RETURN v_fecha;
END;
$$;

CREATE OR REPLACE FUNCTION fn_set_proxima_fecha_gasto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.proxima_fecha_vencimiento IS NULL THEN
    NEW.proxima_fecha_vencimiento := fn_calcular_proxima_fecha_gasto(NEW.dia_vencimiento);
  ELSIF TG_OP = 'UPDATE' AND NEW.dia_vencimiento IS DISTINCT FROM OLD.dia_vencimiento THEN
    NEW.proxima_fecha_vencimiento := fn_calcular_proxima_fecha_gasto(NEW.dia_vencimiento);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gastos_recurrentes_proxima_fecha
  BEFORE INSERT OR UPDATE OF dia_vencimiento ON gastos_recurrentes
  FOR EACH ROW EXECUTE FUNCTION fn_set_proxima_fecha_gasto();

CREATE TRIGGER trg_categorias_gastos_updated_at
  BEFORE UPDATE ON categorias_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_gastos_recurrentes_updated_at
  BEFORE UPDATE ON gastos_recurrentes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_pagos_gastos_updated_at
  BEFORE UPDATE ON pagos_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_avanzar_vencimiento(p_gasto_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gasto   gastos_recurrentes;
  v_base    DATE;
  v_proximo DATE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_gasto
    FROM gastos_recurrentes
   WHERE id = p_gasto_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gasto recurrente no encontrado';
  END IF;

  v_base := (date_trunc('month', v_gasto.proxima_fecha_vencimiento)::DATE + INTERVAL '1 month')::DATE;
  v_proximo := make_date(
    EXTRACT(YEAR FROM v_base)::INT,
    EXTRACT(MONTH FROM v_base)::INT,
    LEAST(
      v_gasto.dia_vencimiento,
      EXTRACT(DAY FROM (v_base + INTERVAL '1 month' - INTERVAL '1 day'))::INT
    )
  );

  UPDATE gastos_recurrentes
     SET proxima_fecha_vencimiento = v_proximo
   WHERE id = p_gasto_id;

  RETURN v_proximo;
END;
$$;

CREATE OR REPLACE FUNCTION fn_registrar_pago_gasto(
  p_categoria_id UUID,
  p_concepto TEXT,
  p_fecha_pago DATE,
  p_medio_pago TEXT,
  p_importe NUMERIC,
  p_gasto_recurrente_id UUID DEFAULT NULL,
  p_comprobante_url TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
)
RETURNS pagos_gastos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago pagos_gastos;
  v_gasto gastos_recurrentes;
  v_fecha_venc DATE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_medio_pago NOT IN ('TRANSFERENCIA','EFECTIVO','CHEQUE','TARJETA') THEN
    RAISE EXCEPTION 'Medio de pago inválido';
  END IF;

  IF p_gasto_recurrente_id IS NOT NULL THEN
    SELECT * INTO v_gasto
      FROM gastos_recurrentes
     WHERE id = p_gasto_recurrente_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Gasto recurrente no encontrado';
    END IF;

    IF v_gasto.categoria_id <> p_categoria_id THEN
      RAISE EXCEPTION 'La categoría no coincide con el gasto recurrente';
    END IF;

    v_fecha_venc := v_gasto.proxima_fecha_vencimiento;
  END IF;

  INSERT INTO pagos_gastos (
    categoria_id,
    gasto_recurrente_id,
    concepto,
    fecha_pago,
    medio_pago,
    importe,
    fecha_vencimiento_pagado,
    comprobante_url,
    notas,
    created_by
  ) VALUES (
    p_categoria_id,
    p_gasto_recurrente_id,
    p_concepto,
    p_fecha_pago,
    p_medio_pago,
    p_importe,
    v_fecha_venc,
    NULLIF(p_comprobante_url, ''),
    NULLIF(p_notas, ''),
    auth.uid()
  )
  RETURNING * INTO v_pago;

  IF p_gasto_recurrente_id IS NOT NULL THEN
    PERFORM fn_avanzar_vencimiento(p_gasto_recurrente_id);
  END IF;

  RETURN v_pago;
END;
$$;

CREATE OR REPLACE VIEW v_proximos_vencimientos
WITH (security_invoker = true)
AS
SELECT
  g.id AS gasto_id,
  g.descripcion,
  g.proxima_fecha_vencimiento,
  g.dia_vencimiento,
  c.id AS categoria_id,
  c.nombre AS categoria_nombre,
  c.color AS categoria_color,
  (g.proxima_fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM gastos_recurrentes g
JOIN categorias_gastos c ON c.id = g.categoria_id
WHERE g.activo = TRUE
  AND c.activo = TRUE
ORDER BY g.proxima_fecha_vencimiento;

CREATE OR REPLACE VIEW v_pagos_gastos_detalle
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.concepto,
  p.fecha_pago,
  p.medio_pago,
  p.importe,
  p.notas,
  p.comprobante_url,
  p.fecha_vencimiento_pagado,
  c.id AS categoria_id,
  c.nombre AS categoria_nombre,
  c.color AS categoria_color,
  g.id AS gasto_recurrente_id,
  g.descripcion AS gasto_descripcion,
  EXTRACT(YEAR FROM p.fecha_pago)::INT AS anio,
  EXTRACT(MONTH FROM p.fecha_pago)::INT AS mes
FROM pagos_gastos p
JOIN categorias_gastos c ON c.id = p.categoria_id
LEFT JOIN gastos_recurrentes g ON g.id = p.gasto_recurrente_id;

ALTER TABLE categorias_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_recurrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_gastos_admin" ON categorias_gastos
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "gastos_recurrentes_admin" ON gastos_recurrentes
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "pagos_gastos_admin" ON pagos_gastos
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER audit_categorias_gastos
  AFTER INSERT OR UPDATE OR DELETE ON categorias_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_gastos_recurrentes
  AFTER INSERT OR UPDATE OR DELETE ON gastos_recurrentes
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_pagos_gastos
  AFTER INSERT OR UPDATE OR DELETE ON pagos_gastos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
