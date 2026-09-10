-- ============================================================
-- 0079_revocar_anon_en_views.sql
--
-- Cierra un agujero de lectura anónima en las 16 vistas del
-- sistema. Detectado el 2026-09-10 mientras se arreglaba el
-- comparativo entre períodos.
--
-- QUÉ PASABA: una vista de Postgres corre por defecto con los
-- permisos de su dueño (`security_definer`), así que **no aplica
-- el RLS de las tablas que lee**. Y Supabase le da SELECT a `anon`
-- a todo lo que se crea en `public` (ALTER DEFAULT PRIVILEGES).
-- Las dos cosas juntas: cualquiera con la anon key —que viaja en
-- el bundle del navegador, es pública por diseño— podía leer sin
-- loguearse lo que las tablas sí protegen. Verificado con curl
-- contra producción: `facturacion_historica` devolvía [] (RLS ok)
-- pero `v_facturacion_historica_normalizada` devolvía las filas.
--
-- Lo más sensible que quedaba expuesto:
--   v_cuenta_corriente         → nombres de clientes y sus saldos
--   v_saldo_fondos             → la caja del estudio
--   v_resultado_mensual        → ingresos, gastos y ganancia
--   v_facturacion_historica_*  → importes y fechas del Excel migrado
--
-- QUÉ HACE: le saca SELECT a `anon` y a PUBLIC. Ninguna pantalla
-- consulta vistas sin sesión —el login solo habla con Supabase
-- Auth y todo lo demás vive detrás del guard—, así que no cambia
-- nada de lo que ve Paola.
--
-- El GRANT a `authenticated` va PRIMERO y es a propósito: si esos
-- SELECT vinieran heredados de PUBLIC, revocar PUBLIC dejaría a
-- las empleadas sin reportes. Con el grant explícito arriba, el
-- revoke de abajo no las puede tocar.
--
-- LO QUE ESTO **NO** ARREGLA: un usuario logueado como empleada
-- sigue viendo por las vistas cosas que su RLS le niega en la
-- tabla (fondos y facturación histórica son solo-admin). El
-- arreglo de fondo es `security_invoker = true` vista por vista,
-- que hay que probar una por una porque cambia qué filas devuelve
-- cada una. Queda anotado como deuda, no entra acá.
-- ============================================================

DO $$
DECLARE
  v_nombre TEXT;
  v_views CONSTANT TEXT[] := ARRAY[
    'v_cuenta_corriente',
    'v_cuenta_corriente_proveedores',
    'v_facturacion_historica_normalizada',
    'v_historial_egresos_estudio',
    'v_imputaciones_detalle',
    'v_ingresos_mensuales',
    'v_ingresos_mensuales_con_historico',
    'v_ingresos_por_empleada_mes',
    'v_ingresos_por_empleada_mes_con_historico',
    'v_ingresos_por_tipo_mes',
    'v_ingresos_por_tipo_mes_con_historico',
    'v_pagos_gastos_detalle',
    'v_proximos_vencimientos',
    'v_recibos_disponibles',
    'v_resultado_mensual',
    'v_saldo_fondos'
  ];
BEGIN
  FOREACH v_nombre IN ARRAY v_views LOOP
    -- to_regclass devuelve NULL si la vista no existe: así la
    -- migración no explota si alguna se elimina más adelante.
    IF to_regclass('public.' || v_nombre) IS NULL THEN
      RAISE NOTICE 'No existe, se omite: %', v_nombre;
      CONTINUE;
    END IF;

    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_nombre);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v_nombre);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', v_nombre);
  END LOOP;
END $$;

-- OJO CON LAS VISTAS NUEVAS: esto tapa las 16 de hoy, no las que
-- vengan. Toda vista que se cree de acá en adelante nace otra vez
-- con SELECT para anon, así que su migración tiene que terminar
-- con las tres líneas de arriba (GRANT authenticated + REVOKE anon
-- + REVOKE PUBLIC).
--
-- Se evaluó resolverlo de una con
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;
-- y se descartó: los default privileges valen solo para los objetos
-- que cree el mismo rol que corre el ALTER. Si mañana una vista se
-- crea desde otro rol, la protección no aplica y nadie se entera
-- —peor que no tenerla—. Además arrastraría también a las tablas.
