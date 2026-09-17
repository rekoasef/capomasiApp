-- ============================================================
-- 0085_editar_y_eliminar_recibo.sql
--
-- Pedido de Renzo (2026-09-17): _"para mí se tendría que poder
-- editar y eliminar el recibo, quiero que ella tenga libertad"_,
-- con el límite que puso él mismo enseguida: _"un recibo que ya se
-- imputó no tendría que poder editarse, yo digo los nuevos... creás
-- un recibo y no lo imputaste, ahí sí tendrías que poder editarlo"_.
--
-- Hasta acá el recibo era lo único del flujo de cobranzas que no se
-- podía corregir: las liquidaciones tienen "Editar" desde la 0070,
-- pero el recibo solo se podía **anular**. Si Paola erraba el
-- importe o el medio de pago al cargarlo, tenía que anular y emitir
-- uno nuevo, quemando un número de la serie que le da a los
-- clientes.
--
-- **La regla: se edita y se elimina mientras no esté imputado.**
-- Un recibo sin imputar es plata que entró y todavía no se aplicó a
-- ninguna factura, así que corregirlo no mueve nada más que a sí
-- mismo. Desde el momento en que se imputa pasa a sostener el
-- estado de una factura (PARCIAL, PAGADA), y editarlo por abajo
-- haría que las facturas cambien de estado sin que nadie lo pida.
-- Para esos está quitar la imputación primero, o anular.
--
-- Cuatro partes:
--
--   1) Auditoría en recibos_medios y cheques. `recibos` e
--      `imputaciones` ya auditaban, pero los medios cuelgan con ON
--      DELETE CASCADE y se iban sin dejar rastro, y los cheques
--      nunca auditaron. Sin esto, eliminar un recibo con dos
--      cheques perdía el desglose para siempre. Con esto, un
--      borrado se reconstruye fila por fila desde audit_log.
--
--   2) fn_liberar_cheques_de_recibo: el agujero que ya existía.
--      fn_anular_recibo borraba los movimientos de fondos del
--      recibo pero **no tocaba los cheques que habían entrado con
--      él**: el cheque quedaba EN_CARTERA en la lista mientras la
--      tarjeta "Cheques en cartera" ya no lo contaba. Al 2026-09-17
--      era latente (2 recibos anulados, ninguno con cheque), pero
--      saltaba la primera vez que anulara un cobro con cheque.
--
--      Regla: si el cheque sigue EN_CARTERA se borra, porque entró
--      con el recibo y no tuvo vida propia. Si ya se movió
--      (DEPOSITADO, ENDOSADO, RECHAZADO, ANULADO) **se rechaza la
--      operación**: ese cheque ya generó movimientos por su cuenta
--      y borrarlo dejaría la caja mintiendo. Primero se resuelve el
--      cheque, después se toca el recibo.
--
--   3) fn_editar_recibo: rearma el recibo en vez de parchearlo.
--      Cambia fecha, medios y notas; **no** cambia el número ni el
--      cliente (el número es el papel entregado, y mover el cliente
--      dejaría el recibo colgado de otra cuenta corriente).
--
--   4) fn_eliminar_recibo: borra de verdad. **El número no vuelve a
--      la serie**: `seq_recibo_c` no retrocede, así que el próximo
--      recibo sigue de largo. Es a propósito — reusar un número que
--      ya se entregó es peor que saltearlo.
-- ============================================================

-- ============================================================
-- 1) Auditoría donde faltaba
-- ============================================================

DROP TRIGGER IF EXISTS audit_recibos_medios ON recibos_medios;
CREATE TRIGGER audit_recibos_medios
  AFTER INSERT OR UPDATE OR DELETE ON recibos_medios
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_cheques ON cheques;
CREATE TRIGGER audit_cheques
  AFTER INSERT OR UPDATE OR DELETE ON cheques
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================
-- 2) Los cheques que entraron con el recibo
--
-- p_conservar: ids de cheques que siguen en el recibo después de
-- editarlo. Los que no están en esa lista se liberan.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_liberar_cheques_de_recibo(
  p_recibo_id  UUID,
  p_conservar  UUID[] DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ids    UUID[];
  v_cheque cheques;
  v_usos   INT;
BEGIN
  -- ---- 1) Qué cheques se van ----------------------------------
  SELECT ARRAY_AGG(DISTINCT c.id)
    INTO v_ids
    FROM cheques c
    JOIN recibos_medios rm ON rm.cheque_id = c.id
   WHERE rm.recibo_id = p_recibo_id
     AND (p_conservar IS NULL OR NOT (c.id = ANY(p_conservar)));

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- ---- 2) Ninguno puede haber tenido vida propia --------------
  FOR v_cheque IN SELECT * FROM cheques WHERE id = ANY(v_ids) LOOP
    IF v_cheque.estado <> 'EN_CARTERA' THEN
      RAISE EXCEPTION
        'El cheque N° % (%) ya está %. Resolvé primero el cheque y después tocá el recibo.',
        v_cheque.numero, v_cheque.banco, lower(v_cheque.estado);
    END IF;

    -- Cinturón además del estado: si el cheque se usó para pagarle
    -- a un proveedor o a una empleada, hay filas que lo referencian
    -- y borrarlo dejaría ese pago sin respaldo.
    SELECT (SELECT COUNT(*) FROM pagos_proveedores WHERE cheque_id = v_cheque.id)
         + (SELECT COUNT(*) FROM pagos_empleadas   WHERE cheque_id = v_cheque.id)
      INTO v_usos;

    IF v_usos > 0 THEN
      RAISE EXCEPTION
        'El cheque N° % (%) está usado en % pago(s). Deshacé esos pagos antes de tocar el recibo.',
        v_cheque.numero, v_cheque.banco, v_usos;
    END IF;
  END LOOP;

  -- ---- 3) Soltar las referencias que apuntan al cheque --------
  -- recibos_medios y recibos lo referencian sin ON DELETE, así que
  -- hay que desengancharlo antes de borrarlo. Los movimientos de
  -- fondos que lo apuntan son los del propio recibo, que el caller
  -- ya borró.
  UPDATE recibos_medios SET cheque_id = NULL
   WHERE recibo_id = p_recibo_id AND cheque_id = ANY(v_ids);

  UPDATE recibos SET cheque_id = NULL
   WHERE id = p_recibo_id AND cheque_id = ANY(v_ids);

  -- ---- 4) Ahora sí ------------------------------------------
  DELETE FROM cheques WHERE id = ANY(v_ids);

  RETURN COALESCE(array_length(v_ids, 1), 0);
END;
$$;

REVOKE ALL ON FUNCTION fn_liberar_cheques_de_recibo(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_liberar_cheques_de_recibo(UUID, UUID[]) TO authenticated;

-- ============================================================
-- 3) Anular: igual que antes, pero devolviendo los cheques
-- ============================================================

CREATE OR REPLACE FUNCTION fn_anular_recibo(
  p_recibo_id UUID,
  p_motivo    TEXT DEFAULT NULL
)
RETURNS recibos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo  recibos;
  v_liq_ids UUID[];
  v_liq_id  UUID;
BEGIN
  SELECT * INTO v_recibo FROM recibos WHERE id = p_recibo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recibo no encontrado'; END IF;
  IF v_recibo.anulado THEN RAISE EXCEPTION 'El recibo ya esta anulado'; END IF;

  SELECT ARRAY_AGG(DISTINCT liquidacion_id) INTO v_liq_ids
    FROM imputaciones WHERE recibo_id = p_recibo_id;

  DELETE FROM imputaciones WHERE recibo_id = p_recibo_id;
  DELETE FROM fondos_movimientos
   WHERE referencia_tipo = 'recibo' AND referencia_id = p_recibo_id;

  -- Los cheques del recibo salen de la cartera. Si alguno ya se
  -- movió, esto levanta excepción y la anulación entera se revierte.
  PERFORM fn_liberar_cheques_de_recibo(p_recibo_id);

  UPDATE recibos
     SET anulado = TRUE, anulado_at = NOW(), anulado_by = auth.uid(),
         motivo_anulacion = p_motivo, updated_at = NOW()
   WHERE id = p_recibo_id RETURNING * INTO v_recibo;

  IF v_liq_ids IS NOT NULL THEN
    FOREACH v_liq_id IN ARRAY v_liq_ids LOOP
      PERFORM fn_recalcular_estado_liquidacion(v_liq_id);
    END LOOP;
  END IF;

  RETURN v_recibo;
END;
$$;

-- ============================================================
-- 4) Guardia común de editar y eliminar
--
-- Las dos operaciones piden lo mismo: recibo vivo, sin imputar, y
-- que no sea el saldo inicial. Vive en una función para que las dos
-- den exactamente el mismo mensaje.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_verificar_recibo_editable(
  p_recibo_id UUID,
  p_accion    TEXT          -- 'editar' | 'eliminar', solo para el mensaje
)
RETURNS recibos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo  recibos;
  v_imp     INT;
  v_total   NUMERIC(14,2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede % un recibo', p_accion;
  END IF;

  SELECT * INTO v_recibo FROM recibos WHERE id = p_recibo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recibo no encontrado'; END IF;

  IF v_recibo.anulado THEN
    RAISE EXCEPTION 'El recibo está anulado: no se puede %', p_accion;
  END IF;

  -- El límite que puso Renzo: mientras no esté imputado, el recibo
  -- no sostiene el estado de ninguna factura y se puede tocar.
  SELECT COUNT(*), COALESCE(SUM(importe), 0) INTO v_imp, v_total
    FROM imputaciones WHERE recibo_id = p_recibo_id;

  IF v_imp > 0 THEN
    RAISE EXCEPTION
      'Este recibo ya está imputado a % factura(s) por $%. Quitá la imputación y después podés %.',
      v_imp, v_total, p_accion;
  END IF;

  -- El saldo inicial a favor no es un cobro con medios de pago: la
  -- plata entró antes del sistema y tiene su propio formulario.
  IF v_recibo.tipo_pago = 'SALDO_INICIAL' THEN
    RAISE EXCEPTION 'El saldo inicial se maneja desde el botón "Editar saldo inicial" de la cuenta corriente';
  END IF;

  RETURN v_recibo;
END;
$$;

REVOKE ALL ON FUNCTION fn_verificar_recibo_editable(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_verificar_recibo_editable(UUID, TEXT) TO authenticated;

-- ============================================================
-- 5) Editar: se rearma el recibo con los medios nuevos
--
-- El número y el cliente no se tocan. El importe sale de la suma
-- de los medios, no se pasa aparte: un solo lugar donde puede
-- estar mal.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_editar_recibo(
  p_recibo_id UUID,
  p_fecha     DATE,
  p_medios    JSONB,
  p_notas     TEXT DEFAULT NULL
)
RETURNS recibos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recibo    recibos;
  v_medio     JSONB;
  v_total     NUMERIC(14,2) := 0;
  v_tipo      TEXT;
  v_cheques   INT;
  v_conservar UUID[];
  v_orden     INT := 0;
BEGIN
  v_recibo := fn_verificar_recibo_editable(p_recibo_id, 'editar');

  IF p_fecha IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria'; END IF;

  IF p_medios IS NULL OR jsonb_array_length(p_medios) = 0 THEN
    RAISE EXCEPTION 'Cargá al menos un medio de pago';
  END IF;

  -- ---- Validación de los medios, igual que al registrar --------
  FOR v_medio IN SELECT * FROM jsonb_array_elements(p_medios) LOOP
    IF v_medio->>'tipo_pago' IS NULL THEN
      RAISE EXCEPTION 'Falta el tipo de pago en un medio';
    END IF;
    IF COALESCE((v_medio->>'importe')::NUMERIC, 0) <= 0 THEN
      RAISE EXCEPTION 'Importe inválido en un medio de pago';
    END IF;
    v_total := v_total + (v_medio->>'importe')::NUMERIC;
  END LOOP;

  -- ---- Cheques que sobreviven a la edición ---------------------
  SELECT ARRAY_AGG((m->>'cheque_id')::UUID)
    INTO v_conservar
    FROM jsonb_array_elements(p_medios) m
   WHERE m->>'cheque_id' IS NOT NULL;

  -- ---- Cabecera antes de los medios ---------------------------
  -- El trigger de fondos lee recibos.fecha, así que la cabecera
  -- tiene que estar actualizada antes de insertar los medios.
  IF jsonb_array_length(p_medios) = 1 THEN
    v_tipo := p_medios->0->>'tipo_pago';
  ELSE
    v_tipo := 'MIXTO';
  END IF;

  SELECT COUNT(*) INTO v_cheques
    FROM jsonb_array_elements(p_medios) m
   WHERE m->>'tipo_pago' = 'CHEQUE';

  UPDATE recibos
     SET fecha           = p_fecha,
         tipo_pago       = v_tipo,
         importe         = v_total,
         importe_usd     = CASE WHEN jsonb_array_length(p_medios) = 1
                                THEN (p_medios->0->>'importe_usd')::NUMERIC END,
         tipo_cambio     = CASE WHEN jsonb_array_length(p_medios) = 1
                                THEN (p_medios->0->>'tipo_cambio')::NUMERIC END,
         cuenta_bancaria = CASE WHEN jsonb_array_length(p_medios) = 1
                                THEN NULLIF(p_medios->0->>'cuenta_bancaria', '') END,
         cheque_id       = CASE WHEN v_cheques = 1 THEN (
                             SELECT (m->>'cheque_id')::UUID
                               FROM jsonb_array_elements(p_medios) m
                              WHERE m->>'tipo_pago' = 'CHEQUE' LIMIT 1
                           ) END,
         notas           = p_notas,
         updated_at      = NOW()
   WHERE id = p_recibo_id
  RETURNING * INTO v_recibo;

  -- ---- Fuera lo viejo -----------------------------------------
  DELETE FROM fondos_movimientos
   WHERE referencia_tipo = 'recibo' AND referencia_id = p_recibo_id;

  -- Antes de borrar los medios, porque la función los usa para
  -- encontrar los cheques del recibo.
  PERFORM fn_liberar_cheques_de_recibo(p_recibo_id, v_conservar);

  DELETE FROM recibos_medios WHERE recibo_id = p_recibo_id;

  -- ---- Adentro lo nuevo (cada medio rehace su movimiento) ------
  FOR v_medio IN SELECT * FROM jsonb_array_elements(p_medios) LOOP
    INSERT INTO recibos_medios (
      recibo_id, orden, tipo_pago, importe,
      cuenta_bancaria, cheque_id, importe_usd, tipo_cambio, created_by
    ) VALUES (
      p_recibo_id,
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

  -- No hace falta recalcular estados de liquidaciones: un recibo
  -- editable es, por definición, uno sin imputaciones.
  RETURN v_recibo;
END;
$$;

REVOKE ALL ON FUNCTION fn_editar_recibo(UUID, DATE, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_editar_recibo(UUID, DATE, JSONB, TEXT) TO authenticated;

-- ============================================================
-- 6) Eliminar: se va del todo, pero queda en audit_log
-- ============================================================

CREATE OR REPLACE FUNCTION fn_eliminar_recibo(p_recibo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM fn_verificar_recibo_editable(p_recibo_id, 'eliminar');

  DELETE FROM fondos_movimientos
   WHERE referencia_tipo = 'recibo' AND referencia_id = p_recibo_id;

  PERFORM fn_liberar_cheques_de_recibo(p_recibo_id);

  -- recibos_medios cae por ON DELETE CASCADE, y ahora cada fila
  -- deja su propio registro en audit_log al irse.
  DELETE FROM recibos WHERE id = p_recibo_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION fn_eliminar_recibo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_eliminar_recibo(UUID) TO authenticated;
