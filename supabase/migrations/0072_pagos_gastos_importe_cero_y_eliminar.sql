-- ============================================================
-- 0072_pagos_gastos_importe_cero_y_eliminar.sql
--
-- Dos pedidos de Paola (2026-09-08) sobre Vencimientos > Gastos:
--
-- 1) Poder registrar un pago con importe 0. Ella usa los gastos
--    recurrentes como checklist: los anuales los tiene cargados
--    como vencimiento y los va "sacando" a medida que los paga,
--    aunque el importe todavia no lo sepa. Hasta ahora el CHECK
--    exigia importe > 0 y tenia que poner 0,01 para destrabarlo.
--    Un pago en 0 igual avanza el vencimiento del gasto recurrente
--    (que es todo el punto), pero no genera movimiento de fondos
--    -- no se movio plata.
--
-- 2) Poder eliminar un pago. No habia forma de borrar: si un pago
--    quedaba duplicado (le paso: cargo dos veces porque el gasto
--    no se le sacaba de pendientes) el unico camino era editarlo.
--    fn_eliminar_pago_gasto borra el pago, su movimiento de fondos
--    y -- si ese pago fue el ultimo que avanzo el vencimiento --
--    devuelve el gasto recurrente al vencimiento anterior, que es
--    exactamente lo que hizo fn_avanzar_vencimiento al registrarlo.
-- ============================================================

-- ============================================================
-- 1) Importe puede ser 0
-- ============================================================
ALTER TABLE pagos_gastos DROP CONSTRAINT IF EXISTS pagos_gastos_importe_check;
ALTER TABLE pagos_gastos ADD CONSTRAINT pagos_gastos_importe_check CHECK (importe >= 0);

-- Un pago en 0 no mueve plata: no tiene que ensuciar Fondos con un
-- movimiento vacio. En UPDATE se borra igual el movimiento viejo
-- primero, asi que editar un pago a 0 tambien lo limpia.
CREATE OR REPLACE FUNCTION fn_pago_gasto_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_importe_banco NUMERIC(14,2) := 0;
  v_importe_efect NUMERIC(14,2) := 0;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM fondos_movimientos WHERE referencia_tipo = 'pago_gasto' AND referencia_id = NEW.id;
  END IF;

  IF NEW.importe = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.medio_pago IN ('TRANSFERENCIA', 'CHEQUE', 'TARJETA') THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.medio_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto,
    importe_banco, importe_efectivo,
    referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago, 'Gasto: ' || NEW.concepto,
    v_importe_banco, v_importe_efect,
    'pago_gasto', NEW.id, NEW.created_by
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2) Eliminar un pago de gasto
-- ============================================================
CREATE OR REPLACE FUNCTION fn_eliminar_pago_gasto(p_pago_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago        pagos_gastos;
  v_gasto       gastos_recurrentes;
  v_ultimo_venc DATE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_pago FROM pagos_gastos WHERE id = p_pago_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;

  DELETE FROM fondos_movimientos
   WHERE referencia_tipo = 'pago_gasto' AND referencia_id = p_pago_id;

  -- Si el pago venia de un gasto recurrente y fue el ultimo que
  -- avanzo el calendario, se devuelve el vencimiento a donde estaba.
  IF v_pago.gasto_recurrente_id IS NOT NULL AND v_pago.fecha_vencimiento_pagado IS NOT NULL THEN
    SELECT * INTO v_gasto
      FROM gastos_recurrentes
     WHERE id = v_pago.gasto_recurrente_id
     FOR UPDATE;

    IF FOUND THEN
      SELECT MAX(fecha_vencimiento_pagado) INTO v_ultimo_venc
        FROM pagos_gastos
       WHERE gasto_recurrente_id = v_pago.gasto_recurrente_id;

      IF v_ultimo_venc = v_pago.fecha_vencimiento_pagado
         AND v_gasto.proxima_fecha_vencimiento > v_pago.fecha_vencimiento_pagado THEN
        UPDATE gastos_recurrentes
           SET proxima_fecha_vencimiento = v_pago.fecha_vencimiento_pagado
         WHERE id = v_pago.gasto_recurrente_id;
      END IF;
    END IF;
  END IF;

  DELETE FROM pagos_gastos WHERE id = p_pago_id;
END;
$$;

REVOKE ALL ON FUNCTION fn_eliminar_pago_gasto(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_eliminar_pago_gasto(UUID) TO authenticated;
