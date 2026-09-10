-- 0079 — Un gasto recurrente ya pagado no vuelve a aparecer como pendiente
--
-- Síntoma (Paola, 2026-09-10): "el cable y las expensas las marqué como pagadas
-- y me vuelven a aparecer".
--
-- Causa: gastosRecurrentesService.update() recalculaba proxima_fecha_vencimiento
-- en el cliente y la mandaba en el payload en CADA edición. El trigger de la DB
-- solo recalcula cuando cambia dia_vencimiento, así que no revertía ese valor:
-- editar un gasto ya pagado le devolvía la fecha del período que YA estaba pagado.
-- El cálculo sale del cliente (ver el service); acá queda la red de seguridad.
--
-- Además fn_eliminar_pago_gasto retrocedía la fecha ANTES de borrar el pago, así
-- que el guard nuevo la habría vuelto a empujar. Se reordena: primero el DELETE.

-- 1) Guard: la próxima fecha nunca cae en un período ya pagado ────────────────
CREATE OR REPLACE FUNCTION public.fn_set_proxima_fecha_gasto()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_ultimo_pagado DATE;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.proxima_fecha_vencimiento IS NULL THEN
    NEW.proxima_fecha_vencimiento := fn_calcular_proxima_fecha_gasto(NEW.dia_vencimiento);
  ELSIF TG_OP = 'UPDATE' AND NEW.dia_vencimiento IS DISTINCT FROM OLD.dia_vencimiento THEN
    NEW.proxima_fecha_vencimiento := fn_calcular_proxima_fecha_gasto(NEW.dia_vencimiento);
  END IF;

  -- Venga de donde venga la fecha (trigger, RPC o UPDATE directo), no puede
  -- quedar en un vencimiento que ya tiene pago registrado.
  IF NEW.proxima_fecha_vencimiento IS NOT NULL THEN
    SELECT MAX(fecha_vencimiento_pagado) INTO v_ultimo_pagado
      FROM pagos_gastos
     WHERE gasto_recurrente_id = NEW.id;

    IF v_ultimo_pagado IS NOT NULL AND NEW.proxima_fecha_vencimiento <= v_ultimo_pagado THEN
      NEW.proxima_fecha_vencimiento :=
        fn_calcular_proxima_fecha_gasto(NEW.dia_vencimiento, v_ultimo_pagado + 1);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- El trigger escuchaba solo UPDATE OF dia_vencimiento; ahora tiene que correr en
-- cualquier UPDATE para que el guard alcance las pisadas de proxima_fecha_vencimiento.
DROP TRIGGER IF EXISTS trg_gastos_recurrentes_proxima_fecha ON public.gastos_recurrentes;
CREATE TRIGGER trg_gastos_recurrentes_proxima_fecha
  BEFORE INSERT OR UPDATE ON public.gastos_recurrentes
  FOR EACH ROW EXECUTE FUNCTION fn_set_proxima_fecha_gasto();

-- 2) Eliminar un pago: borrar primero, retroceder después ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_eliminar_pago_gasto(p_pago_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- El DELETE va antes del retroceso: si no, el guard del trigger vería el pago
  -- que estamos borrando y volvería a empujar la fecha hacia adelante.
  DELETE FROM pagos_gastos WHERE id = p_pago_id;

  IF v_pago.gasto_recurrente_id IS NOT NULL AND v_pago.fecha_vencimiento_pagado IS NOT NULL THEN
    SELECT * INTO v_gasto
      FROM gastos_recurrentes
     WHERE id = v_pago.gasto_recurrente_id
     FOR UPDATE;

    IF FOUND AND v_gasto.proxima_fecha_vencimiento > v_pago.fecha_vencimiento_pagado THEN
      SELECT MAX(fecha_vencimiento_pagado) INTO v_ultimo_venc
        FROM pagos_gastos
       WHERE gasto_recurrente_id = v_pago.gasto_recurrente_id;

      IF v_ultimo_venc IS NULL OR v_ultimo_venc < v_pago.fecha_vencimiento_pagado THEN
        UPDATE gastos_recurrentes
           SET proxima_fecha_vencimiento = v_pago.fecha_vencimiento_pagado
         WHERE id = v_pago.gasto_recurrente_id;
      END IF;
    END IF;
  END IF;
END;
$function$;

-- 3) La fecha la pone la DB, el cliente no la manda ───────────────────────────
-- El NOT NULL obligaba al tipo generado a exigir la columna en el INSERT. Se
-- reemplaza por un CHECK equivalente: el BEFORE trigger corre antes de los checks,
-- así que la garantía de no-nulo se mantiene igual.
ALTER TABLE public.gastos_recurrentes ALTER COLUMN proxima_fecha_vencimiento DROP NOT NULL;
ALTER TABLE public.gastos_recurrentes
  ADD CONSTRAINT gastos_recurrentes_proxima_fecha_no_nula
  CHECK (proxima_fecha_vencimiento IS NOT NULL);

-- 4) Reparar las filas que quedaron reviviendo ────────────────────────────────
UPDATE gastos_recurrentes g
   SET proxima_fecha_vencimiento =
         fn_calcular_proxima_fecha_gasto(g.dia_vencimiento, u.ult_pagado + 1)
  FROM (SELECT gasto_recurrente_id, MAX(fecha_vencimiento_pagado) AS ult_pagado
          FROM pagos_gastos
         WHERE gasto_recurrente_id IS NOT NULL
           AND fecha_vencimiento_pagado IS NOT NULL
         GROUP BY gasto_recurrente_id) u
 WHERE u.gasto_recurrente_id = g.id
   AND g.proxima_fecha_vencimiento <= u.ult_pagado;
