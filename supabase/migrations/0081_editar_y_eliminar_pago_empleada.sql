-- ============================================================
-- 0081_editar_y_eliminar_pago_empleada.sql
--
-- Paola cargó mal un pago de sueldo el 2026-09-11 y no pudo ni
-- corregirlo ni borrarlo: la tabla de Pagos del detalle de una
-- empleada no tenía acciones, y el service tampoco tenía con qué.
--
-- El agujero de fondo es el que avisaba el comentario de la 0049
-- cuando creó el trigger que manda el pago a fondos: "No se maneja
-- reversión: ninguno de los dos módulos tiene hoy una operación de
-- anular/eliminar pago". Para compras a proveedores eso se tapó en
-- la 0075 con fn_eliminar_compra_proveedor; a los pagos de sueldos
-- nunca se les llegó.
--
-- Acá alcanza con completar los triggers que faltaban, en vez de
-- una RPC como la de compras: un pago de sueldo genera exactamente
-- un movimiento de fondos y no arrastra nada más, así que la regla
-- vive entera en la DB y el service hace un UPDATE o un DELETE
-- común. Se borra en vez de contra-asentar, como en la 0075: esto
-- corrige una carga equivocada, no un hecho económico, y un
-- contra-asiento dejaría dos líneas de ruido en Fondos.
--
-- El rastro no se pierde: pagos_empleadas ya tiene trigger de
-- auditoría desde la 0037, así que el UPDATE y el DELETE quedan
-- en audit_log con la fila vieja.
--
-- Los pagos anteriores a la 0049 no tienen movimiento de fondos
-- asociado. El UPDATE no les inventa uno a propósito: si en su
-- momento el egreso se cargó a mano en Fondos, crearlo ahora lo
-- duplicaría. En esos casos el UPDATE solo toca el pago.
-- ============================================================

-- ── 1) Editar un pago sincroniza su movimiento de fondos ──────

CREATE OR REPLACE FUNCTION fn_pago_empleada_sync_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre_empleada         TEXT;
  v_importe_banco           NUMERIC(14,2) := 0;
  v_importe_efect           NUMERIC(14,2) := 0;
  v_importe_cheques_cartera NUMERIC(14,2) := 0;
BEGIN
  SELECT nombre INTO v_nombre_empleada FROM empleadas WHERE id = NEW.empleada_id;

  -- El reparto de columnas es el mismo que fija fn_pago_empleada_a_fondos
  -- desde la 0050: un sueldo pagado con cheque sale de la cartera, no del
  -- banco. Si esa regla cambia, las dos funciones se tocan juntas.
  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    v_importe_cheques_cartera := NEW.importe;
  END IF;

  UPDATE fondos_movimientos
     SET fecha                   = NEW.fecha_pago,
         concepto                = 'Pago sueldo: ' || COALESCE(v_nombre_empleada, '')
                                   || ' (' || NEW.periodo_mes || '/' || NEW.periodo_anio || ')',
         cuenta_bancaria         = NEW.cuenta_bancaria,
         importe_banco           = v_importe_banco,
         importe_efectivo        = v_importe_efect,
         importe_cheques_cartera = v_importe_cheques_cartera,
         cheque_id               = NEW.cheque_id
   WHERE referencia_tipo = 'pago_empleada'
     AND referencia_id   = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pago_empleada_sync_fondos ON pagos_empleadas;
CREATE TRIGGER trigger_pago_empleada_sync_fondos
  AFTER UPDATE ON pagos_empleadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_empleada_sync_fondos();

-- ── 2) Borrar un pago se lleva su movimiento de fondos ────────

CREATE OR REPLACE FUNCTION fn_pago_empleada_borra_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM fondos_movimientos
   WHERE referencia_tipo = 'pago_empleada'
     AND referencia_id   = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pago_empleada_borra_fondos ON pagos_empleadas;
CREATE TRIGGER trigger_pago_empleada_borra_fondos
  BEFORE DELETE ON pagos_empleadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_pago_empleada_borra_fondos();
