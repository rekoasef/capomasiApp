-- ============================================================
-- 0082_cheque_salida_sin_factura.sql
--
-- Pedido de Paola (2026-09-17, WhatsApp con captura):
--   "no puedo sacar los cheques cuando los cambio en una cueva
--    o los saco para pagar algo propio (...) me debería dejar
--    sacarlos poniendo solamente la nota de lo que hice sin que
--    se impute a una factura".
--
-- Hasta hoy, un cheque de tercero EN_CARTERA tenía tres salidas
-- posibles y ninguna servía para eso:
--   · DEPOSITADO  → lo manda al banco (plata que nunca entró ahí).
--   · ENDOSADO    → fn_endosar_cheque_a_proveedor exige proveedor
--                   + factura impaga (0054). Si el cheque se fue a
--                   una cueva o a un gasto personal no hay factura
--                   que imputar, así que el botón queda muerto.
--   · RECHAZADO/ANULADO → dicen que la plata nunca existió, que es
--                   mentira: el cheque salió y algo entró a cambio.
-- Resultado: el cheque se quedaba en cartera para siempre y
-- saldo_cheques_cartera mentía.
--
-- Esta migración agrega la cuarta salida: entregar el cheque sin
-- factura, con la nota como único dato obligatorio. Dos destinos,
-- que es lo que ella describió:
--
--   CAMBIO_EFECTIVO → lo cambió en una cueva/financiera. Sale de
--     cartera por el importe del cheque y entra lo que le dieron
--     (efectivo o banco), que normalmente es menos. La diferencia
--     baja la caja sola y eso es correcto: es el costo del cambio.
--     No se crea un gasto — Paola pidió "solamente la nota".
--
--   PERSONAL → lo usó para algo suyo. Sale de cartera y no vuelve
--     nada al estudio. Tampoco genera gasto, por la misma razón
--     que la 0075 sacó las compras personales del resultado del
--     estudio: la plata se va de la caja, no del resultado.
--
-- El cheque queda en ENDOSADO (que es lo que pasó de verdad: se
-- lo entregó a un tercero), sin proveedor_id.
--
-- Reversión: si se equivocó al cargarlo, volver el cheque a
-- cualquier otro estado borra los movimientos de la salida y
-- devuelve el cheque a cartera. Se hace con un trigger propio
-- porque el de la 0060 solo entiende RECHAZADO/ANULADO, y ahí
-- pone los importes en cero en vez de borrar la fila — para una
-- salida con contrapartida en efectivo eso dejaría viva la plata
-- que entró.
-- ============================================================

-- ── 1) Registrar la salida ────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_salida_cheque_sin_factura(
  p_cheque_id        UUID,
  p_destino          TEXT,             -- 'CAMBIO_EFECTIVO' | 'PERSONAL'
  p_fecha            DATE,
  p_notas            TEXT,
  p_importe_recibido NUMERIC DEFAULT NULL,       -- solo CAMBIO_EFECTIVO
  p_cuenta_recibido  TEXT    DEFAULT 'efectivo'  -- 'efectivo' | 'banco'
)
RETURNS cheques
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cheque   cheques;
  v_concepto TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede dar salida a un cheque';
  END IF;

  IF p_destino NOT IN ('CAMBIO_EFECTIVO', 'PERSONAL') THEN
    RAISE EXCEPTION 'Destino inválido: %', p_destino;
  END IF;

  IF p_notas IS NULL OR btrim(p_notas) = '' THEN
    RAISE EXCEPTION 'Contá en la nota qué hiciste con el cheque';
  END IF;

  IF p_fecha IS NULL THEN
    RAISE EXCEPTION 'La fecha es obligatoria';
  END IF;

  SELECT * INTO v_cheque FROM cheques WHERE id = p_cheque_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cheque no encontrado';
  END IF;

  IF v_cheque.tipo <> 'TERCERO' THEN
    RAISE EXCEPTION 'Solo se pueden entregar cheques de terceros (recibidos de un cliente)';
  END IF;

  IF v_cheque.estado <> 'EN_CARTERA' THEN
    RAISE EXCEPTION 'El cheque no está en cartera (estado actual: %)', v_cheque.estado;
  END IF;

  IF p_destino = 'CAMBIO_EFECTIVO' THEN
    IF p_cuenta_recibido NOT IN ('efectivo', 'banco') THEN
      RAISE EXCEPTION 'Cuenta inválida para lo recibido: %', p_cuenta_recibido;
    END IF;
    IF p_importe_recibido IS NULL OR p_importe_recibido <= 0 THEN
      RAISE EXCEPTION 'Cargá cuánto te dieron por el cheque';
    END IF;
    IF p_importe_recibido > v_cheque.importe THEN
      RAISE EXCEPTION 'Lo recibido no puede superar el importe del cheque (%)', v_cheque.importe;
    END IF;
  END IF;

  v_concepto := CASE p_destino
    WHEN 'CAMBIO_EFECTIVO' THEN 'Cheque cambiado: N° '
    ELSE 'Cheque usado para gasto personal: N° '
  END || v_cheque.numero || ' (' || v_cheque.banco || ')';

  -- Sale de cartera por el importe del cheque. Lleva cheque_id para
  -- que quede junto al INGRESO original y el neto del cheque en
  -- saldo_cheques_cartera dé 0, igual que en el endoso a proveedor.
  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_cheques_cartera, cheque_id,
    referencia_tipo, referencia_id, notas, created_by
  ) VALUES (
    'EGRESO', p_fecha, v_concepto,
    v_cheque.importe, p_cheque_id,
    'cheque_salida', p_cheque_id, p_notas, auth.uid()
  );

  -- Lo que entró a cambio va sin cheque_id: es plata fungible y no
  -- tiene que moverse si después se confirma/desmarca la
  -- acreditación del cheque (fn_mover_cheque_cartera_a_banco).
  IF p_destino = 'CAMBIO_EFECTIVO' THEN
    INSERT INTO fondos_movimientos (
      tipo_movimiento, fecha, concepto,
      importe_efectivo, importe_banco,
      referencia_tipo, referencia_id, notas, created_by
    ) VALUES (
      'INGRESO', p_fecha,
      'Cobro de cheque N° ' || v_cheque.numero || ' (' || v_cheque.banco || ')',
      CASE WHEN p_cuenta_recibido = 'efectivo' THEN p_importe_recibido ELSE 0 END,
      CASE WHEN p_cuenta_recibido = 'banco'    THEN p_importe_recibido ELSE 0 END,
      'cheque_salida', p_cheque_id, p_notas, auth.uid()
    );
  END IF;

  -- La nota se agrega a la que ya tuviera el cheque, no la pisa.
  UPDATE cheques
     SET estado      = 'ENDOSADO',
         fecha_cobro = p_fecha,
         notas       = CASE
                         WHEN COALESCE(btrim(notas), '') = '' THEN p_notas
                         ELSE notas || chr(10) || p_notas
                       END,
         updated_at  = NOW()
   WHERE id = p_cheque_id
  RETURNING * INTO v_cheque;

  RETURN v_cheque;
END;
$$;

-- ── 2) Volver atrás borra la salida ───────────────────────────
-- Regla de Renzo: un error de carga se borra, no queda anulado —
-- pero el borrado tiene que devolver la plata a donde estaba.

CREATE OR REPLACE FUNCTION fn_revertir_salida_cheque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.estado = 'ENDOSADO' AND NEW.estado <> 'ENDOSADO' THEN
    DELETE FROM fondos_movimientos
     WHERE referencia_tipo = 'cheque_salida'
       AND referencia_id   = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_revertir_salida_cheque ON cheques;
CREATE TRIGGER trigger_revertir_salida_cheque
  AFTER UPDATE OF estado ON cheques
  FOR EACH ROW
  WHEN (NEW.estado IS DISTINCT FROM OLD.estado)
  EXECUTE FUNCTION fn_revertir_salida_cheque();

REVOKE ALL ON FUNCTION fn_salida_cheque_sin_factura(UUID, TEXT, DATE, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_salida_cheque_sin_factura(UUID, TEXT, DATE, TEXT, NUMERIC, TEXT) TO authenticated;
