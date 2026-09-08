-- ============================================================
-- 0073_recibo_varios_medios_de_pago.sql
--
-- Pedido de Paola (2026-09-08): "si me pagan con dos cheques y
-- efectivo tengo que hacer tres recibos distintos, no puedo hacer
-- uno como el que me paga".
--
-- Tenia razon y se ve en los datos: el 07/09 emitio C-0127 + C-0128
-- + C-0129 para SOC-MAR (dos cheques y el efectivo que completaba
-- el monto exacto de la FC_A 386) y C-0131 + C-0132 + C-0133 para
-- SANTILLI (mismo patron contra la FC_A 385). Un cobro, tres
-- recibos, porque `recibos` tenia un solo tipo_pago y un solo
-- cheque_id.
--
-- Esta migracion hace dos cosas:
--
-- 1) recibos_medios: el desglose. Un recibo guarda el total y
--    cuelga N medios (cheque, cheque, efectivo), cada uno con su
--    importe y sus datos propios. Cada medio genera su propio
--    movimiento de fondos -- asi cada cheque entra a cartera por
--    separado, que es lo que hace falta para seguirle el estado.
--
-- 2) Saca el corte por serie A/C de fn_registrar_recibo. Ese corte
--    (migracion 0018) partia el recibo en dos cuando el cobro
--    tocaba facturas A y facturas C a la vez. En la practica nunca
--    se activo: solo corre si se imputa en el momento de cargar el
--    recibo, y Paola carga el recibo suelto y lo imputa despues
--    (fn_imputar_recibo, que nunca miro la serie). Resultado: los
--    11 recibos reales son serie C y 7 estan imputados a facturas
--    A. Renzo decidio el 2026-09-08 sacar el corte y dejar una
--    sola numeracion, que es como se venia usando de hecho.
--
--    Si el contador de Paola despues dice que el recibo tiene que
--    llevar la letra de la factura, esto se revierte con otra
--    migracion: no se borra ni se renumera nada aca.
--
-- Lo que NO se toca:
--   * Los recibos ya emitidos conservan su numero (C-0126..C-0134).
--     Se sigue numerando con seq_recibo_c y el prefijo 'C-' para no
--     cortar la continuidad de lo que ya le dio a los clientes.
--   * seq_recibo_a y fn_serie_recibo_de_tipo_comprobante quedan en
--     la base, sin uso, por si hay que volver atras.
--   * fn_imputar_recibo, fn_anular_recibo y las views no cambian de
--     semantica.
--   * El saldo inicial a favor (fn_guardar_saldo_inicial) inserta
--     su recibo directo, sin medios: no es un cobro con medio de
--     pago, la plata entro antes del sistema. Un recibo sin medios
--     se muestra por recibos.tipo_pago, como hasta ahora.
-- ============================================================

-- ============================================================
-- 1) Tabla de medios
-- ============================================================
CREATE TABLE IF NOT EXISTS recibos_medios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id       UUID NOT NULL REFERENCES recibos(id) ON DELETE CASCADE,
  orden           INT NOT NULL DEFAULT 0,
  tipo_pago       TEXT NOT NULL CHECK (tipo_pago IN (
                    'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'USD', 'COMPENSACION'
                  )),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  cuenta_bancaria TEXT,
  cheque_id       UUID REFERENCES cheques(id),
  importe_usd     NUMERIC(14,2),
  tipo_cambio     NUMERIC(14,4),
  created_by      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recibos_medios_recibo ON recibos_medios(recibo_id);
CREATE INDEX IF NOT EXISTS idx_recibos_medios_cheque ON recibos_medios(cheque_id)
  WHERE cheque_id IS NOT NULL;

ALTER TABLE recibos_medios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recibos_medios_read   ON recibos_medios;
DROP POLICY IF EXISTS recibos_medios_insert ON recibos_medios;
DROP POLICY IF EXISTS recibos_medios_update ON recibos_medios;
DROP POLICY IF EXISTS recibos_medios_delete ON recibos_medios;

-- Mismas reglas que recibos: todos los autenticados leen y cargan,
-- solo admin corrige o borra.
CREATE POLICY recibos_medios_read   ON recibos_medios FOR SELECT USING (is_authenticated_user());
CREATE POLICY recibos_medios_insert ON recibos_medios FOR INSERT WITH CHECK (is_authenticated_user());
CREATE POLICY recibos_medios_update ON recibos_medios FOR UPDATE USING (is_admin());
CREATE POLICY recibos_medios_delete ON recibos_medios FOR DELETE USING (is_admin());

-- 'MIXTO' para el recibo que tiene mas de un medio.
ALTER TABLE recibos DROP CONSTRAINT IF EXISTS recibos_tipo_pago_check;
ALTER TABLE recibos ADD CONSTRAINT recibos_tipo_pago_check CHECK (tipo_pago IN (
  'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'USD', 'COMPENSACION', 'SALDO_INICIAL', 'MIXTO'
));

-- ============================================================
-- 2) Backfill: cada recibo existente pasa a tener su medio unico.
--    Va ANTES del trigger de fondos, porque estos recibos ya
--    generaron su movimiento en su momento y no hay que duplicarlo.
-- ============================================================
INSERT INTO recibos_medios (
  recibo_id, orden, tipo_pago, importe,
  cuenta_bancaria, cheque_id, importe_usd, tipo_cambio, created_by, created_at
)
SELECT
  r.id, 0, r.tipo_pago, r.importe,
  r.cuenta_bancaria, r.cheque_id, r.importe_usd, r.tipo_cambio, r.created_by, r.created_at
FROM recibos r
WHERE r.tipo_pago <> 'SALDO_INICIAL'
  AND NOT EXISTS (SELECT 1 FROM recibos_medios m WHERE m.recibo_id = r.id);

-- ============================================================
-- 3) Fondos: el movimiento pasa a generarse por medio, no por
--    recibo. Un recibo con dos cheques deja dos movimientos, cada
--    uno con su cheque_id, para que la cartera los siga por
--    separado. La referencia sigue siendo ('recibo', recibo.id),
--    asi fn_anular_recibo los borra a todos sin cambios.
-- ============================================================
DROP TRIGGER IF EXISTS trigger_recibo_a_fondos ON recibos;
DROP FUNCTION IF EXISTS fn_recibo_a_fondos();

CREATE OR REPLACE FUNCTION fn_recibo_medio_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo                  recibos;
  v_nombre_cliente          TEXT;
  v_importe_banco           NUMERIC(14,2) := 0;
  v_importe_efect           NUMERIC(14,2) := 0;
  v_importe_usd             NUMERIC(14,2) := 0;
  v_importe_cheques_cartera NUMERIC(14,2) := 0;
BEGIN
  -- COMPENSACION: no entra plata, se cruza trabajo contra trabajo.
  IF NEW.tipo_pago = 'COMPENSACION' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_recibo FROM recibos WHERE id = NEW.recibo_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT nombre INTO v_nombre_cliente FROM clientes WHERE id = v_recibo.cliente_id;

  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    v_importe_cheques_cartera := NEW.importe;
  ELSIF NEW.tipo_pago = 'USD' THEN
    v_importe_usd := COALESCE(NEW.importe_usd, 0);
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo, importe_usd, importe_cheques_cartera,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'INGRESO',
    v_recibo.fecha,
    'Recibo cliente: ' || COALESCE(v_nombre_cliente, ''),
    v_importe_banco, v_importe_efect, v_importe_usd, v_importe_cheques_cartera,
    NEW.cheque_id, 'recibo', v_recibo.id, COALESCE(NEW.created_by, v_recibo.created_by)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_recibo_medio_a_fondos
  AFTER INSERT ON recibos_medios
  FOR EACH ROW
  EXECUTE FUNCTION fn_recibo_medio_a_fondos();

-- ============================================================
-- 4) fn_registrar_recibo sin corte de series, con medios
--
--    p_medios es un array [{tipo_pago, importe, cuenta_bancaria,
--    cheque_id, importe_usd, tipo_cambio}]. Si viene NULL o vacio
--    se arma un medio unico con los parametros sueltos, para que
--    cualquier llamada vieja siga funcionando igual.
--
--    p_vuelto_efectivo se mantiene: cheque del que se devuelve
--    parte en efectivo. Antes generaba dos recibos (A por el cheque
--    y C por el vuelto); ahora es un recibo con dos medios. Los
--    numeros son los mismos.
-- ============================================================
-- Se dropea la version vieja en vez de reemplazarla: agregar un
-- parametro cambia la firma, y CREATE OR REPLACE dejaria las dos
-- conviviendo como sobrecarga -- con llamadas ambiguas desde
-- PostgREST.
DROP FUNCTION IF EXISTS fn_registrar_recibo(
  UUID, DATE, TEXT, NUMERIC, JSONB, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT, NUMERIC
);

CREATE FUNCTION fn_registrar_recibo(
  p_cliente_id      UUID,
  p_fecha           DATE,
  p_tipo_pago       TEXT,
  p_importe         NUMERIC,
  p_imputaciones    JSONB DEFAULT '[]'::JSONB,
  p_numero_recibo   TEXT DEFAULT NULL,
  p_importe_usd     NUMERIC DEFAULT NULL,
  p_tipo_cambio     NUMERIC DEFAULT NULL,
  p_cuenta_bancaria TEXT DEFAULT NULL,
  p_cheque_id       UUID DEFAULT NULL,
  p_notas           TEXT DEFAULT NULL,
  p_vuelto_efectivo NUMERIC DEFAULT 0,
  p_medios          JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo        recibos;
  v_medios        JSONB;
  v_medio         JSONB;
  v_total_medios  NUMERIC(14,2) := 0;
  v_imp           JSONB;
  v_imp_importe   NUMERIC(14,2);
  v_total_imp     NUMERIC(14,2) := 0;
  v_liq_id        UUID;
  v_liq           liquidaciones;
  v_vuelto        NUMERIC(14,2) := COALESCE(p_vuelto_efectivo, 0);
  v_numero        TEXT;
  v_tipo_recibo   TEXT;
  v_cheques       INT;
  v_orden         INT := 0;
BEGIN
  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'Importe del recibo inválido';
  END IF;
  IF v_vuelto < 0 THEN
    RAISE EXCEPTION 'Vuelto en efectivo inválido';
  END IF;

  -- ---- Medios --------------------------------------------------
  IF p_medios IS NULL OR jsonb_array_length(p_medios) = 0 THEN
    v_medios := jsonb_build_array(jsonb_build_object(
      'tipo_pago',       p_tipo_pago,
      'importe',         p_importe,
      'cuenta_bancaria', p_cuenta_bancaria,
      'cheque_id',       p_cheque_id,
      'importe_usd',     p_importe_usd,
      'tipo_cambio',     p_tipo_cambio
    ));
  ELSE
    v_medios := p_medios;
  END IF;

  -- El vuelto parte el cheque en dos medios: lo que queda del
  -- cheque y el efectivo devuelto. Solo tiene sentido sobre un
  -- cheque unico, que es como lo ofrece el formulario.
  IF v_vuelto > 0 THEN
    IF jsonb_array_length(v_medios) <> 1
       OR (v_medios->0->>'tipo_pago') <> 'CHEQUE' THEN
      RAISE EXCEPTION 'El vuelto en efectivo solo aplica a un recibo con un único cheque';
    END IF;
    IF v_vuelto >= p_importe THEN
      RAISE EXCEPTION 'El vuelto en efectivo (%) no puede ser mayor o igual al importe del recibo (%)',
        v_vuelto, p_importe;
    END IF;
    v_medios := jsonb_build_array(
      jsonb_set(v_medios->0, '{importe}', to_jsonb(p_importe - v_vuelto)),
      jsonb_build_object('tipo_pago', 'EFECTIVO', 'importe', v_vuelto)
    );
  END IF;

  FOR v_medio IN SELECT * FROM jsonb_array_elements(v_medios) LOOP
    IF COALESCE((v_medio->>'importe')::NUMERIC, 0) <= 0 THEN
      RAISE EXCEPTION 'Importe inválido en un medio de pago';
    END IF;
    IF v_medio->>'tipo_pago' IS NULL THEN
      RAISE EXCEPTION 'Falta el tipo de pago en un medio';
    END IF;
    v_total_medios := v_total_medios + (v_medio->>'importe')::NUMERIC;
  END LOOP;

  IF ABS(v_total_medios - p_importe) > 0.001 THEN
    RAISE EXCEPTION 'Los medios de pago suman % y el recibo es de %',
      v_total_medios, p_importe;
  END IF;

  -- ---- Imputaciones --------------------------------------------
  IF jsonb_array_length(p_imputaciones) > 0 THEN
    FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones) LOOP
      v_liq_id      := (v_imp->>'liquidacion_id')::UUID;
      v_imp_importe := (v_imp->>'importe')::NUMERIC;

      IF v_imp_importe IS NULL OR v_imp_importe <= 0 THEN
        RAISE EXCEPTION 'Importe de imputación inválido';
      END IF;

      SELECT * INTO v_liq FROM liquidaciones WHERE id = v_liq_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Liquidación % no encontrada', v_liq_id;
      END IF;
      IF v_liq.estado = 'ANULADA' THEN
        RAISE EXCEPTION 'No se puede imputar a una liquidación anulada';
      END IF;
      IF v_liq.cliente_id <> p_cliente_id THEN
        RAISE EXCEPTION 'La liquidación no pertenece al cliente del recibo';
      END IF;

      v_total_imp := v_total_imp + v_imp_importe;
    END LOOP;

    IF v_total_imp > p_importe + 0.001 THEN
      RAISE EXCEPTION 'Las imputaciones (%) superan el importe del recibo (%)',
        v_total_imp, p_importe;
    END IF;
  END IF;

  -- ---- Cabecera del recibo -------------------------------------
  -- tipo_pago queda como resumen: el medio unico, o MIXTO. Los
  -- campos sueltos (cuenta, cheque, USD) se copian solo cuando hay
  -- un unico medio; con varios el detalle vive en recibos_medios.
  IF jsonb_array_length(v_medios) = 1 THEN
    v_tipo_recibo := v_medios->0->>'tipo_pago';
  ELSE
    v_tipo_recibo := 'MIXTO';
  END IF;

  SELECT COUNT(*) INTO v_cheques
    FROM jsonb_array_elements(v_medios) m
   WHERE m->>'tipo_pago' = 'CHEQUE';

  v_numero := COALESCE(
    NULLIF(p_numero_recibo, ''),
    'C-' || LPAD(nextval('seq_recibo_c')::TEXT, 4, '0')
  );

  INSERT INTO recibos (
    cliente_id, numero_recibo, fecha, tipo_pago, importe,
    importe_usd, tipo_cambio, cuenta_bancaria, cheque_id, notas, created_by
  )
  VALUES (
    p_cliente_id,
    v_numero,
    p_fecha,
    v_tipo_recibo,
    p_importe,
    CASE WHEN jsonb_array_length(v_medios) = 1 THEN (v_medios->0->>'importe_usd')::NUMERIC END,
    CASE WHEN jsonb_array_length(v_medios) = 1 THEN (v_medios->0->>'tipo_cambio')::NUMERIC END,
    CASE WHEN jsonb_array_length(v_medios) = 1 THEN v_medios->0->>'cuenta_bancaria' END,
    CASE WHEN v_cheques = 1 THEN (
      SELECT (m->>'cheque_id')::UUID
        FROM jsonb_array_elements(v_medios) m
       WHERE m->>'tipo_pago' = 'CHEQUE'
       LIMIT 1
    ) END,
    p_notas,
    auth.uid()
  )
  RETURNING * INTO v_recibo;

  -- ---- Medios (cada uno dispara su movimiento de fondos) -------
  FOR v_medio IN SELECT * FROM jsonb_array_elements(v_medios) LOOP
    INSERT INTO recibos_medios (
      recibo_id, orden, tipo_pago, importe,
      cuenta_bancaria, cheque_id, importe_usd, tipo_cambio, created_by
    ) VALUES (
      v_recibo.id,
      v_orden,
      v_medio->>'tipo_pago',
      (v_medio->>'importe')::NUMERIC,
      NULLIF(v_medio->>'cuenta_bancaria', ''),
      (v_medio->>'cheque_id')::UUID,
      (v_medio->>'importe_usd')::NUMERIC,
      (v_medio->>'tipo_cambio')::NUMERIC,
      auth.uid()
    );
    v_orden := v_orden + 1;
  END LOOP;

  -- ---- Imputaciones --------------------------------------------
  IF jsonb_array_length(p_imputaciones) > 0 THEN
    FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones) LOOP
      v_liq_id := (v_imp->>'liquidacion_id')::UUID;
      INSERT INTO imputaciones (recibo_id, liquidacion_id, importe, created_by)
      VALUES (v_recibo.id, v_liq_id, (v_imp->>'importe')::NUMERIC, auth.uid());
      PERFORM fn_recalcular_estado_liquidacion(v_liq_id);
    END LOOP;
  END IF;

  -- Se devuelve un array de un elemento: antes podian salir dos
  -- recibos por el corte de series y el front ya sabe leer array.
  RETURN jsonb_build_array(to_jsonb(v_recibo));
END;
$$;

-- ============================================================
-- 5) La view de recibos expone el desglose
-- ============================================================
CREATE OR REPLACE VIEW v_recibos_disponibles AS
SELECT r.id,
       r.cliente_id,
       r.numero_recibo,
       r.fecha,
       r.tipo_pago,
       r.importe,
       r.importe_usd,
       r.tipo_cambio,
       r.cuenta_bancaria,
       r.cheque_id,
       r.notas,
       r.anulado,
       r.created_at,
       COALESCE(sum(i.importe), 0::numeric) AS total_imputado,
       (r.importe - COALESCE(sum(i.importe), 0::numeric)) AS saldo_libre,
       (
         SELECT jsonb_agg(
                  jsonb_build_object(
                    'id',              m.id,
                    'tipo_pago',       m.tipo_pago,
                    'importe',         m.importe,
                    'cuenta_bancaria', m.cuenta_bancaria,
                    'cheque_id',       m.cheque_id,
                    'cheque_numero',   ch.numero,
                    'cheque_banco',    ch.banco,
                    'importe_usd',     m.importe_usd,
                    'tipo_cambio',     m.tipo_cambio
                  )
                  ORDER BY m.orden, m.created_at
                )
           FROM recibos_medios m
           LEFT JOIN cheques ch ON ch.id = m.cheque_id
          WHERE m.recibo_id = r.id
       ) AS medios
  FROM recibos r
  LEFT JOIN imputaciones i ON i.recibo_id = r.id
 WHERE r.anulado = false
 GROUP BY r.id;
