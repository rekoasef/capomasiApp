-- ============================================================
-- 0086_cheques_emitidos_fuera_de_cartera.sql
--
-- Pedido de Paola (2026-11-06, WhatsApp):
--   "suma mal los cheques en cartera (...) y no me marca los
--    emitidos, va pone que son propios, si podés ponelos en rojo
--    así no me confunden".
--
-- Desde la 0050 un cheque propio (emitido) se registraba como
-- EGRESO de "Cheques en cartera" hasta que se tildaba la
-- acreditación, y recién ahí pasaba a Banco. Pero un cheque que
-- emite el estudio nunca estuvo en la cartera: la cartera son los
-- cheques de terceros que Paola tiene en la mano. Restarlo ahí
-- dejaba la tarjeta por debajo de la lista de cheques (el N° 41
-- de $929.000 del 2026-11-05 la bajó en ese importe).
--
-- Regla nueva para los cheques PROPIO:
--   · Al emitirlo (carga manual o pago a proveedor) no se mueve
--     ningún saldo. El movimiento queda registrado en cero, como
--     ya pasaba con un cheque rechazado.
--   · Al tildar la acreditación ("debitado") sale de Banco por el
--     importe del cheque. Al destildarla vuelve.
--   · Anularlo o rechazarlo lo deja en cero; reactivarlo vuelve a
--     Banco solo si estaba tildado. Nunca toca la cartera.
-- Los cheques de TERCERO siguen exactamente igual que antes.
--
-- Al final se corrigen los movimientos de cheques propios que ya
-- habían restado de la cartera.
-- ============================================================

-- ── 1) Cheque propio cargado a mano: no toca la cartera ───────

CREATE OR REPLACE FUNCTION public.fn_registrar_cheque_manual(
  p_tipo            TEXT,
  p_numero          TEXT,
  p_banco           TEXT,
  p_importe         NUMERIC,
  p_fecha_emision   DATE,
  p_fecha_cobro     DATE DEFAULT NULL,
  p_cliente_id      UUID DEFAULT NULL,
  p_proveedor_id    UUID DEFAULT NULL,
  p_cuenta_bancaria TEXT DEFAULT NULL,
  p_notas           TEXT DEFAULT NULL
)
RETURNS cheques
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cheque   cheques;
  v_origen   TEXT;
  v_concepto TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede cargar cheques manualmente';
  END IF;

  IF p_tipo NOT IN ('PROPIO', 'TERCERO') THEN
    RAISE EXCEPTION 'Tipo de cheque inválido: %', p_tipo;
  END IF;

  IF p_importe IS NULL OR p_importe <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser mayor a 0';
  END IF;

  v_origen := CASE WHEN p_tipo = 'TERCERO' THEN 'CLIENTE' ELSE 'EMITIDO' END;

  INSERT INTO cheques (
    tipo, numero, banco, importe, fecha_emision, fecha_cobro,
    origen, cliente_id, proveedor_id, cuenta_bancaria, notas, estado
  ) VALUES (
    p_tipo, p_numero, p_banco, p_importe, p_fecha_emision, p_fecha_cobro,
    v_origen, p_cliente_id, p_proveedor_id, p_cuenta_bancaria, p_notas, 'EN_CARTERA'
  )
  RETURNING * INTO v_cheque;

  IF p_tipo = 'TERCERO' THEN
    SELECT 'Cheque cargado manualmente' ||
           CASE WHEN c.nombre IS NOT NULL THEN ' — ' || c.nombre ELSE '' END
      INTO v_concepto
    FROM clientes c WHERE c.id = p_cliente_id;

    INSERT INTO fondos_movimientos (
      tipo_movimiento, fecha, concepto, cuenta_bancaria,
      importe_cheques_cartera, cheque_id, referencia_tipo, referencia_id, created_by
    ) VALUES (
      'INGRESO', p_fecha_emision, COALESCE(v_concepto, 'Cheque cargado manualmente'), p_cuenta_bancaria,
      p_importe, v_cheque.id, 'cheque_manual', v_cheque.id, auth.uid()
    );
  ELSE
    SELECT 'Cheque emitido' ||
           CASE WHEN p.nombre IS NOT NULL THEN ' — ' || p.nombre ELSE '' END
      INTO v_concepto
    FROM proveedores p WHERE p.id = p_proveedor_id;

    -- En cero hasta que se tilde el débito (ver fn_mover_cheque_cartera_a_banco).
    INSERT INTO fondos_movimientos (
      tipo_movimiento, fecha, concepto, cuenta_bancaria,
      importe_banco, importe_cheques_cartera, cheque_id, referencia_tipo, referencia_id, created_by
    ) VALUES (
      'EGRESO', p_fecha_emision, COALESCE(v_concepto, 'Cheque emitido'), p_cuenta_bancaria,
      0, 0, v_cheque.id, 'cheque_manual', v_cheque.id, auth.uid()
    );
  END IF;

  RETURN v_cheque;
END;
$$;

-- ── 2) Pago a proveedor con cheque propio: tampoco ────────────
-- Con un cheque de tercero (endoso) sí sale de la cartera, como antes.

CREATE OR REPLACE FUNCTION public.fn_pago_proveedor_a_fondos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_concepto                TEXT;
  v_importe_banco           NUMERIC(14,2) := 0;
  v_importe_efect           NUMERIC(14,2) := 0;
  v_importe_cheques_cartera NUMERIC(14,2) := 0;
  v_tipo_cheque             TEXT;
BEGIN
  SELECT 'Pago a proveedor: ' || COALESCE(p.nombre, c.concepto)
    INTO v_concepto
  FROM compras_proveedores c
  LEFT JOIN proveedores p ON p.id = c.proveedor_id
  WHERE c.id = NEW.compra_id;

  IF NEW.tipo_pago = 'TRANSFERENCIA' THEN
    v_importe_banco := NEW.importe;
  ELSIF NEW.tipo_pago = 'EFECTIVO' THEN
    v_importe_efect := NEW.importe;
  ELSIF NEW.tipo_pago = 'CHEQUE' THEN
    SELECT tipo INTO v_tipo_cheque FROM cheques WHERE id = NEW.cheque_id;
    IF COALESCE(v_tipo_cheque, 'TERCERO') <> 'PROPIO' THEN
      v_importe_cheques_cartera := NEW.importe;
    END IF;
  END IF;

  INSERT INTO fondos_movimientos (
    tipo_movimiento, fecha, concepto, cuenta_bancaria,
    importe_banco, importe_efectivo, importe_cheques_cartera,
    cheque_id, referencia_tipo, referencia_id, created_by
  ) VALUES (
    'EGRESO', NEW.fecha_pago, COALESCE(v_concepto, 'Pago a proveedor'), NEW.cuenta_bancaria,
    v_importe_banco, v_importe_efect, v_importe_cheques_cartera,
    NEW.cheque_id, 'pago_proveedor', NEW.id, auth.uid()
  );

  RETURN NEW;
END;
$$;

-- ── 3) Tildar la acreditación: el propio sale de Banco ────────

CREATE OR REPLACE FUNCTION public.fn_mover_cheque_cartera_a_banco()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tipo = 'PROPIO' THEN
    -- Anulado o rechazado ya está en cero y así se queda.
    IF NEW.estado IN ('RECHAZADO', 'ANULADO') THEN
      RETURN NEW;
    END IF;
    IF NEW.acreditacion_confirmada AND NOT OLD.acreditacion_confirmada THEN
      UPDATE fondos_movimientos
         SET importe_banco = NEW.importe,
             importe_cheques_cartera = 0
       WHERE cheque_id = NEW.id;
    ELSIF NOT NEW.acreditacion_confirmada AND OLD.acreditacion_confirmada THEN
      UPDATE fondos_movimientos
         SET importe_banco = 0,
             importe_cheques_cartera = 0
       WHERE cheque_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.acreditacion_confirmada AND NOT OLD.acreditacion_confirmada THEN
    UPDATE fondos_movimientos
       SET importe_banco = importe_banco + importe_cheques_cartera,
           importe_cheques_cartera = 0
     WHERE cheque_id = NEW.id;
  ELSIF NOT NEW.acreditacion_confirmada AND OLD.acreditacion_confirmada THEN
    UPDATE fondos_movimientos
       SET importe_cheques_cartera = importe_cheques_cartera + importe_banco,
           importe_banco = 0
     WHERE cheque_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 4) Reactivar un propio anulado: nunca vuelve a la cartera ─

CREATE OR REPLACE FUNCTION public.fn_reversar_movimiento_cheque_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.estado IN ('RECHAZADO', 'ANULADO') AND OLD.estado NOT IN ('RECHAZADO', 'ANULADO') THEN
    UPDATE fondos_movimientos
       SET importe_banco = 0,
           importe_cheques_cartera = 0
     WHERE cheque_id = NEW.id;
  ELSIF OLD.estado IN ('RECHAZADO', 'ANULADO') AND NEW.estado NOT IN ('RECHAZADO', 'ANULADO') THEN
    UPDATE fondos_movimientos
       SET importe_banco           = CASE WHEN NEW.acreditacion_confirmada THEN NEW.importe ELSE 0 END,
           importe_cheques_cartera = CASE
                                       WHEN NEW.tipo = 'PROPIO' THEN 0
                                       WHEN NEW.acreditacion_confirmada THEN 0
                                       ELSE NEW.importe
                                     END
     WHERE cheque_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 5) Corregir los propios que ya restaron de la cartera ─────
-- Al 2026-11-10 es un solo movimiento: el del cheque N° 41
-- ($929.000, sin debitar). El anulado del mismo número ya estaba
-- en cero. Si alguno estuviera tildado, queda en Banco.

UPDATE fondos_movimientos m
   SET importe_cheques_cartera = 0,
       importe_banco = CASE
                         WHEN c.estado IN ('RECHAZADO', 'ANULADO') THEN 0
                         WHEN c.acreditacion_confirmada THEN c.importe
                         ELSE 0
                       END
  FROM cheques c
 WHERE c.id = m.cheque_id
   AND c.tipo = 'PROPIO'
   AND m.importe_cheques_cartera <> 0;
