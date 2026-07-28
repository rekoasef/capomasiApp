-- ============================================================
-- 0054_endosar_cheque_a_proveedor.sql
-- Paola a veces le paga a un proveedor entregándole (endosando)
-- un cheque de tercero que ya tiene en cartera (recibido de un
-- cliente), en vez de emitir un cheque propio. Antes, marcar un
-- cheque como ENDOSADO en Fondos > Cheques era solo un cambio de
-- estado cosmético: no quedaba registrado a qué proveedor/compra
-- se aplicó, y el importe seguía contando en saldo_cheques_cartera
-- para siempre (a diferencia de RECHAZADO/ANULADO, que sí revierten
-- el movimiento).
--
-- Esta función endosa el cheque registrando un pago real contra
-- una compra del proveedor (reutiliza fn_registrar_pago_proveedor,
-- que ya dispara fn_pago_proveedor_a_fondos y deja un EGRESO en
-- cartera con el mismo cheque_id que el INGRESO original — el neto
-- en saldo_cheques_cartera para ese cheque queda en 0, como
-- corresponde: la plata entró y volvió a salir sin tocar el banco).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_endosar_cheque_a_proveedor(
  p_cheque_id  UUID,
  p_compra_id  UUID,
  p_importe    NUMERIC,
  p_fecha_pago DATE,
  p_notas      TEXT DEFAULT NULL
)
RETURNS pagos_proveedores
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cheque       cheques;
  v_proveedor_id UUID;
  v_pago         pagos_proveedores;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede endosar cheques';
  END IF;

  SELECT * INTO v_cheque FROM cheques WHERE id = p_cheque_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cheque no encontrado';
  END IF;

  IF v_cheque.tipo <> 'TERCERO' THEN
    RAISE EXCEPTION 'Solo se pueden endosar cheques de terceros (recibidos de un cliente)';
  END IF;

  IF v_cheque.estado <> 'EN_CARTERA' THEN
    RAISE EXCEPTION 'El cheque no está en cartera (estado actual: %)', v_cheque.estado;
  END IF;

  IF p_importe IS NULL OR p_importe <= 0 OR p_importe > v_cheque.importe THEN
    RAISE EXCEPTION 'El importe a aplicar debe ser mayor a 0 y no puede superar el importe del cheque (%)',
      v_cheque.importe;
  END IF;

  SELECT proveedor_id INTO v_proveedor_id FROM compras_proveedores WHERE id = p_compra_id;
  IF v_proveedor_id IS NULL THEN
    RAISE EXCEPTION 'Compra no encontrada';
  END IF;

  v_pago := fn_registrar_pago_proveedor(
    p_compra_id, 'CHEQUE', p_importe, p_fecha_pago, NULL, p_cheque_id, p_notas
  );

  UPDATE cheques
     SET estado       = 'ENDOSADO',
         proveedor_id = v_proveedor_id,
         fecha_cobro  = p_fecha_pago,
         updated_at   = NOW()
   WHERE id = p_cheque_id;

  RETURN v_pago;
END;
$$;
