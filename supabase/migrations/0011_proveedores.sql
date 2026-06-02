-- Subfase 2.3: Proveedores y Gastos
-- Tablas: proveedores, compras_proveedores, pagos_proveedores
-- Alter: cheques añade proveedor_id

CREATE TABLE proveedores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  cuit       TEXT,
  rubro      TEXT,
  telefono   TEXT,
  email      TEXT,
  notas      TEXT,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proveedores_nombre ON proveedores(nombre);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proveedores_read"  ON proveedores FOR SELECT USING (is_authenticated_user());
CREATE POLICY "proveedores_write" ON proveedores FOR ALL    USING (is_admin());

-- Añadir FK a cheques ahora que proveedores existe
ALTER TABLE cheques ADD COLUMN proveedor_id UUID REFERENCES proveedores(id);

-- compras_proveedores
CREATE TABLE compras_proveedores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id     UUID NOT NULL REFERENCES proveedores(id),
  fecha            DATE NOT NULL,
  concepto         TEXT NOT NULL,
  nro_comprobante  TEXT,
  tipo_comprobante TEXT,
  importe_total    NUMERIC(14,2) NOT NULL CHECK (importe_total > 0),
  estado           TEXT NOT NULL DEFAULT 'PENDIENTE'
                     CHECK (estado IN ('PENDIENTE', 'PAGADA', 'PARCIALMENTE_PAGADA', 'ANULADA')),
  notas            TEXT,
  created_by       UUID REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compras_proveedor ON compras_proveedores(proveedor_id);
CREATE INDEX idx_compras_fecha     ON compras_proveedores(fecha);
CREATE INDEX idx_compras_estado    ON compras_proveedores(estado);

ALTER TABLE compras_proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compras_read"  ON compras_proveedores FOR SELECT USING (is_authenticated_user());
CREATE POLICY "compras_write" ON compras_proveedores FOR ALL    USING (is_admin());

-- pagos_proveedores
CREATE TABLE pagos_proveedores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id       UUID NOT NULL REFERENCES compras_proveedores(id),
  tipo_pago       TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE')),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_pago      DATE NOT NULL,
  cuenta_bancaria TEXT,
  cheque_id       UUID REFERENCES cheques(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_prov_compra ON pagos_proveedores(compra_id);
CREATE INDEX idx_pagos_prov_fecha  ON pagos_proveedores(fecha_pago);

ALTER TABLE pagos_proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_prov_solo_admin" ON pagos_proveedores FOR ALL USING (is_admin());

-- RPC: registrar pago a proveedor (actualiza estado de la compra)
CREATE OR REPLACE FUNCTION fn_registrar_pago_proveedor(
  p_compra_id       UUID,
  p_tipo_pago       TEXT,
  p_importe         NUMERIC,
  p_fecha_pago      DATE,
  p_cuenta_bancaria TEXT DEFAULT NULL,
  p_cheque_id       UUID DEFAULT NULL,
  p_notas           TEXT DEFAULT NULL
)
RETURNS pagos_proveedores
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pago       pagos_proveedores;
  v_total      NUMERIC;
  v_pagado     NUMERIC;
  v_nuevo_est  TEXT;
BEGIN
  INSERT INTO pagos_proveedores (compra_id, tipo_pago, importe, fecha_pago, cuenta_bancaria, cheque_id, notas)
  VALUES (p_compra_id, p_tipo_pago, p_importe, p_fecha_pago, p_cuenta_bancaria, p_cheque_id, p_notas)
  RETURNING * INTO v_pago;

  SELECT importe_total INTO v_total FROM compras_proveedores WHERE id = p_compra_id;
  SELECT COALESCE(SUM(importe), 0) INTO v_pagado FROM pagos_proveedores WHERE compra_id = p_compra_id;

  IF v_pagado >= v_total THEN
    v_nuevo_est := 'PAGADA';
  ELSIF v_pagado > 0 THEN
    v_nuevo_est := 'PARCIALMENTE_PAGADA';
  ELSE
    v_nuevo_est := 'PENDIENTE';
  END IF;

  UPDATE compras_proveedores SET estado = v_nuevo_est, updated_at = NOW() WHERE id = p_compra_id;

  RETURN v_pago;
END;
$$;
