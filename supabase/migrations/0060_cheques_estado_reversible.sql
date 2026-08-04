-- ============================================================
-- 0060_cheques_estado_reversible.sql
-- Hasta ahora la UI solo dejaba cambiar el estado de un cheque
-- mientras estaba EN_CARTERA — una vez DEPOSITADO (o cualquier
-- otro estado) no había forma de corregirlo si se cargó mal
-- (ej: marcado como depositado sin querer). Se habilita el cambio
-- de estado libre desde cualquier estado actual hacia cualquier
-- otro (ver ChequesTable.tsx).
--
-- Eso expone un problema en fn_reversar_movimiento_cheque_estado:
-- al pasar a RECHAZADO/ANULADO borraba (DELETE) la fila de
-- fondos_movimientos asociada. Si después se revertía el estado
-- (ej: ANULADO → EN_CARTERA por error de carga), la plata quedaba
-- perdida del ledger para siempre, sin fila que restaurar.
--
-- Se cambia DELETE por "poner en cero" (misma idea: la plata no
-- cuenta mientras esté rechazado/anulado), y se agrega el camino
-- inverso: al salir de RECHAZADO/ANULADO hacia cualquier otro
-- estado, se restaura el importe en banco o en cartera según si
-- ya estaba acreditado.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_reversar_movimiento_cheque_estado()
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
           importe_cheques_cartera = CASE WHEN NEW.acreditacion_confirmada THEN 0 ELSE NEW.importe END
     WHERE cheque_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
