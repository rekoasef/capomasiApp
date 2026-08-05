-- Facturación histórica (Excel pre-migración, columnas A-L de "FC y COBRANZAS")
-- Tabla puramente informativa: no tiene FKs a clientes/liquidaciones ni impacta
-- cuenta corriente, honorarios ni ninguna lógica de negocio existente.
-- Se carga una sola vez por migración de datos; nadie edita desde la app.
-- RLS: solo admin lee. Sin políticas de insert/update/delete -> bloqueado
-- para authenticated, solo se carga con la service_role key (import).

CREATE TABLE facturacion_historica (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_liquidacion    DATE,
  cliente              TEXT NOT NULL,
  servicio             TEXT,
  generado_por         TEXT,
  periodo_liquidado    TEXT,
  anio_liquidado       INTEGER,
  detalle              TEXT,
  importe_liquidado    NUMERIC(14,2),
  comprobante_tipo     TEXT,
  comprobante_numero   TEXT,
  comprobante_emisor   TEXT,
  importe_facturado    NUMERIC(14,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facturacion_historica_cliente     ON facturacion_historica(cliente);
CREATE INDEX idx_facturacion_historica_fecha       ON facturacion_historica(fecha_liquidacion);
CREATE INDEX idx_facturacion_historica_generado_por ON facturacion_historica(generado_por);

ALTER TABLE facturacion_historica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facturacion_historica_solo_admin_lee" ON facturacion_historica
  FOR SELECT USING (is_admin());
