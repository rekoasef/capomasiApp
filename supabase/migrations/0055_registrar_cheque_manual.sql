-- ============================================================
-- 0055_registrar_cheque_manual.sql
-- Hasta ahora la única forma de crear un cheque era como efecto
-- secundario de un recibo de cliente (TERCERO) o un pago a
-- proveedor (PROPIO). No había forma de cargar un cheque que
-- Paola ya tiene en mano por fuera de esos dos flujos (ej: saldos
-- iniciales al migrar del Excel, o un cheque que le dieron sin
-- pasar por un recibo formal).
--
-- Esta función crea el cheque y, para mantener la contabilidad de
-- Fondos consistente con los otros dos flujos, genera también el
-- movimiento en fondos_movimientos:
--   - TERCERO (recibido) → INGRESO en cheques en cartera
--   - PROPIO (emitido)   → EGRESO en cheques en cartera
-- Las transiciones de estado posteriores (depositar, endosar,
-- rechazar, anular, confirmar acreditación) ya funcionan igual
-- para estos cheques que para los generados automáticamente,
-- porque esos triggers matchean por cheque_id sin importar el
-- origen del movimiento.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_registrar_cheque_manual(
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
    SELECT 'Cheque cargado manualmente' ||
           CASE WHEN p.nombre IS NOT NULL THEN ' — ' || p.nombre ELSE '' END
      INTO v_concepto
    FROM proveedores p WHERE p.id = p_proveedor_id;

    INSERT INTO fondos_movimientos (
      tipo_movimiento, fecha, concepto, cuenta_bancaria,
      importe_cheques_cartera, cheque_id, referencia_tipo, referencia_id, created_by
    ) VALUES (
      'EGRESO', p_fecha_emision, COALESCE(v_concepto, 'Cheque cargado manualmente'), p_cuenta_bancaria,
      p_importe, v_cheque.id, 'cheque_manual', v_cheque.id, auth.uid()
    );
  END IF;

  RETURN v_cheque;
END;
$$;
