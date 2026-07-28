-- ============================================================
-- seed-demo-data.sql
-- Carga de datos ficticios para probar la plataforma con volumen
-- realista (6 meses, feb-jul 2026). TODO lo que crea queda
-- marcado con el prefijo "DEMO " en nombres de clientes/empleadas/
-- proveedores, y con el texto "[DEMO]" en conceptos/descripciones
-- de tablas sin nombre propio (gastos, notas).
--
-- No es una migración — es un script puntual, se corre a mano vía
-- Supabase MCP execute_sql. Ver cleanup-demo-data.sql para revertir
-- todo al terminar de probar.
--
-- Corre en fases porque varias tablas dependen de RPCs admin-gated
-- (is_admin() lee auth.uid(), que fuera de una sesión autenticada
-- normal viene NULL). Por eso cada fase que llama RPCs empieza
-- simulando el JWT de un admin real con set_config.
-- ============================================================

-- admin real de la base (Paola) — usado para simular auth.uid()
-- en las fases que llaman RPCs con is_admin()
-- (verificado: SELECT id FROM usuarios WHERE rol='admin' LIMIT 1)
-- 987812c6-fe66-46b2-bde7-dab2c1132ce5

-- ============================================================
-- FASE 1: Anchors + configuración
-- ============================================================

INSERT INTO clientes (nombre, cuit, domicilio, localidad, activo)
VALUES
  ('DEMO Constructora del Sur SRL', '30712345671', 'Av. San Martín 450', 'Armstrong', true),
  ('DEMO Panadería La Espiga SA',   '30712345672', 'Belgrano 210',        'Armstrong', true),
  ('DEMO Juan Martínez',            '20712345673', 'Sarmiento 88',        'Armstrong', true),
  ('DEMO Textil Armstrong SRL',     '30712345674', 'Ruta 9 Km 302',       'Armstrong', true),
  ('DEMO María Fernández',          '27712345675', 'Mitre 155',           'Armstrong', true);

INSERT INTO empleadas (nombre, apellido, tipo_relacion, tipo_comision, activo)
VALUES
  ('DEMO', 'Sofía Ramírez', 'DEPENDENCIA', 'PUNTAJE',    true),
  ('DEMO', 'Martín Gómez',  'DEPENDENCIA', 'PRODUCCION', true);

INSERT INTO proveedores (nombre, cuit, rubro, activo)
VALUES
  ('DEMO Papelera Armstrong', '30712345680', 'LIBRERIA', true),
  ('DEMO Distribuidora Insumos SRL', '30712345681', 'GASTOS_GENERALES', true);

-- Honorarios mensuales (uno activo por cliente desde feb-2026)
INSERT INTO honorarios_mensuales (cliente_id, monto, vigente_desde, notas)
SELECT id, v.monto, DATE '2026-02-01', '[DEMO]'
FROM clientes c
JOIN (VALUES
  ('DEMO Constructora del Sur SRL', 150000),
  ('DEMO Panadería La Espiga SA',   220000),
  ('DEMO Juan Martínez',             90000),
  ('DEMO Textil Armstrong SRL',     180000),
  ('DEMO María Fernández',          130000)
) AS v(nombre, monto) ON v.nombre = c.nombre;

-- Ajuste de honorario a mitad de año para el primer cliente
UPDATE honorarios_mensuales
   SET vigente_hasta = DATE '2026-04-30'
 WHERE cliente_id = (SELECT id FROM clientes WHERE nombre = 'DEMO Constructora del Sur SRL')
   AND vigente_hasta IS NULL;

INSERT INTO honorarios_mensuales (cliente_id, monto, vigente_desde, porcentaje_ajuste, notas)
SELECT id, 165000, DATE '2026-05-01', 10, '[DEMO] ajuste 10%'
FROM clientes WHERE nombre = 'DEMO Constructora del Sur SRL';

-- Config de comisiones
INSERT INTO comisiones_config (empleada_id, tipo_calculo, valor, umbral_puntaje, vigente_desde)
SELECT id, 'MONTO_FIJO', 0, 15.5, DATE '2026-02-01'
FROM empleadas WHERE nombre = 'DEMO' AND apellido = 'Sofía Ramírez';

INSERT INTO comisiones_config (empleada_id, tipo_calculo, valor, vigente_desde)
SELECT id, 'PORCENTAJE', 12, DATE '2026-02-01'
FROM empleadas WHERE nombre = 'DEMO' AND apellido = 'Martín Gómez';

-- Puntos por trabajo (todos asignados a Sofía)
INSERT INTO puntos_trabajo_config (cliente_id, empleada_id, tipo_trabajo, puntos, tipo_vencimiento, dia_vencimiento_mensual, facturar_aparte)
SELECT c.id, e.id, v.tipo_trabajo, v.puntos, 'MENSUAL', v.dia, v.facturar_aparte
FROM (VALUES
  ('DEMO Constructora del Sur SRL', 'BALANCE',        5, 20, true),
  ('DEMO Panadería La Espiga SA',   'CERTIFICACIONES', 3, 15, false)
) AS v(cliente_nombre, tipo_trabajo, puntos, dia, facturar_aparte)
JOIN clientes c ON c.nombre = v.cliente_nombre
JOIN empleadas e ON e.nombre = 'DEMO' AND e.apellido = 'Sofía Ramírez';

INSERT INTO puntos_trabajo_config (cliente_id, empleada_id, tipo_trabajo, puntos, tipo_vencimiento, mes_vencimiento_anual, dia_vencimiento_anual, facturar_aparte)
SELECT c.id, e.id, 'DDJJ', 8, 'ANUAL', 5, 31, true
FROM clientes c, empleadas e
WHERE c.nombre = 'DEMO Textil Armstrong SRL' AND e.nombre = 'DEMO' AND e.apellido = 'Sofía Ramírez';

INSERT INTO puntos_trabajo_config (cliente_id, empleada_id, tipo_trabajo, puntos, tipo_vencimiento, facturar_aparte)
SELECT c.id, e.id, 'BIENES_PERSONALES', 4, 'A_DEMANDA', false
FROM clientes c, empleadas e
WHERE c.nombre = 'DEMO María Fernández' AND e.nombre = 'DEMO' AND e.apellido = 'Sofía Ramírez';

-- Trabajos anuales (variedad de estados)
INSERT INTO honorarios_anuales (cliente_id, tipo_trabajo, anio, honorario, estado, notas)
SELECT c.id, v.tipo_trabajo, 2026, v.honorario, v.estado, '[DEMO]'
FROM (VALUES
  ('DEMO Constructora del Sur SRL', 'BALANCE',      300000, 'FINALIZADO'),
  ('DEMO Juan Martínez',            'GANANCIAS_PF',  80000, 'PENDIENTE'),
  ('DEMO Textil Armstrong SRL',     'DDJJ',         150000, 'COBRADO')
) AS v(cliente_nombre, tipo_trabajo, honorario, estado)
JOIN clientes c ON c.nombre = v.cliente_nombre;

-- ============================================================
-- FASE 2: Vencimientos + trabajos_realizados + compras + gastos
-- (bulk, sin RPC — se aprueban/pagan en fase 3)
-- ============================================================

-- Vencimientos con puntaje (ligados a puntos_trabajo_config) — feb a jul, MENSUAL
INSERT INTO vencimientos (
  cliente_id, empleada_id, tipo_vencimiento, fecha_vencimiento, descripcion,
  ambito, estado_avance, completado, puntos_config_id, puntos_snapshot
)
SELECT
  cfg.cliente_id, cfg.empleada_id, cfg.tipo_trabajo,
  make_date(2026, mes, cfg.dia_vencimiento_mensual),
  '[DEMO] ' || cfg.tipo_trabajo || ' mensual',
  'CLIENTE', 'PENDIENTE', false, cfg.id, cfg.puntos
FROM puntos_trabajo_config cfg
CROSS JOIN generate_series(2, 7) AS mes
WHERE cfg.tipo_vencimiento = 'MENSUAL';

-- Vencimientos genéricos (sin puntos), variedad de ámbito y tipo — 2 por cliente por mes
INSERT INTO vencimientos (cliente_id, tipo_vencimiento, fecha_vencimiento, descripcion, ambito, estado_avance, completado)
SELECT c.id, v.tipo, make_date(2026, mes, v.dia), '[DEMO] ' || v.tipo, 'CLIENTE', 'PENDIENTE', false
FROM clientes c
CROSS JOIN generate_series(2, 7) AS mes
CROSS JOIN (VALUES ('AFIP', 10), ('IIBB_PROVINCIAL', 25)) AS v(tipo, dia)
WHERE c.nombre LIKE 'DEMO %';

-- Vencimientos del estudio (ambito ESTUDIO) — uno por mes
INSERT INTO vencimientos (tipo_vencimiento, fecha_vencimiento, descripcion, ambito, estado_avance, completado)
SELECT 'OTRO', make_date(2026, mes, 12), '[DEMO] Pago SOS estudio', 'ESTUDIO', 'PENDIENTE', false
FROM generate_series(2, 7) AS mes;

-- Vencimientos personales de Paola (ambito PERSONAL) — uno por mes
INSERT INTO vencimientos (tipo_vencimiento, fecha_vencimiento, descripcion, ambito, estado_avance, completado)
SELECT 'GANANCIAS', make_date(2026, mes, 18), '[DEMO] Ganancias personal Paola', 'PERSONAL', 'PENDIENTE', false
FROM generate_series(2, 7) AS mes;

-- Trabajos realizados — Sofía (puntaje, tipos que matchean puntos_trabajo_config)
INSERT INTO trabajos_realizados (empleada_id, fecha, cliente_id, tipo_trabajo, descripcion, periodo_mes, periodo_anio)
SELECT e.id, make_date(2026, mes, 8), c.id, v.tipo_trabajo, '[DEMO] trabajo de ' || v.tipo_trabajo, mes, 2026
FROM empleadas e
CROSS JOIN generate_series(2, 7) AS mes
CROSS JOIN (VALUES
  ('DEMO Constructora del Sur SRL', 'BALANCE'),
  ('DEMO Panadería La Espiga SA',   'CERTIFICACIONES'),
  ('DEMO Textil Armstrong SRL',     'DDJJ'),
  ('DEMO María Fernández',          'BIENES_PERSONALES')
) AS v(cliente_nombre, tipo_trabajo)
JOIN clientes c ON c.nombre = v.cliente_nombre
WHERE e.nombre = 'DEMO' AND e.apellido = 'Sofía Ramírez';

-- Trabajos realizados — Martín (producción, comisión manual al aprobar)
INSERT INTO trabajos_realizados (empleada_id, fecha, cliente_id, tipo_trabajo, descripcion, periodo_mes, periodo_anio)
SELECT e.id, make_date(2026, mes, 14), c.id, 'CONSULTORIA_COSTOS', '[DEMO] consultoría de costos', mes, 2026
FROM empleadas e
CROSS JOIN generate_series(2, 7) AS mes
CROSS JOIN (SELECT id FROM clientes WHERE nombre = 'DEMO Juan Martínez') c
WHERE e.nombre = 'DEMO' AND e.apellido = 'Martín Gómez';

-- Compras a proveedores — 1-2 por proveedor por mes
INSERT INTO compras_proveedores (proveedor_id, fecha, concepto, importe_total, tipo_comprobante)
SELECT p.id, make_date(2026, mes, 7), '[DEMO] Compra insumos', 45000 + (mes * 1500), 'FC_A'
FROM proveedores p
CROSS JOIN generate_series(2, 7) AS mes
WHERE p.nombre LIKE 'DEMO %';

-- Gastos del estudio y personales
INSERT INTO pagos_gastos (categoria_id, concepto, fecha_pago, medio_pago, importe)
SELECT cg.id, '[DEMO] ' || cg.nombre || ' mes ' || mes, make_date(2026, mes, 5), 'TRANSFERENCIA', 35000 + (mes * 800)
FROM categorias_gastos cg
CROSS JOIN generate_series(2, 7) AS mes
WHERE cg.nombre IN ('Impuestos Estudio', 'Servicios y Sistemas Estudio');

INSERT INTO pagos_gastos (categoria_id, concepto, fecha_pago, medio_pago, importe)
SELECT cg.id, '[DEMO] ' || cg.nombre || ' mes ' || mes, make_date(2026, mes, 9), 'TARJETA', 20000 + (mes * 500)
FROM categorias_gastos cg
CROSS JOIN generate_series(2, 7) AS mes
WHERE cg.nombre = 'Servicios';

-- ============================================================
-- FASE 3: aprobaciones, liquidaciones/recibos, cheques, pagos
-- (llama RPCs admin-gated -> simula auth.uid() del admin real)
-- ============================================================

DO $$
DECLARE
  v_admin_id      UUID := '987812c6-fe66-46b2-bde7-dab2c1132ce5';
  v_sofia_id      UUID;
  v_martin_id     UUID;
  v_cliente       RECORD;
  v_mes           INT;
  v_trabajo       RECORD;
  v_liq_id        UUID;
  v_honorario     NUMERIC;
  v_combo         INT;
  v_cheque_id     UUID;
  v_compra        RECORD;
  v_compra_target RECORD;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, false);

  SELECT id INTO v_sofia_id  FROM empleadas WHERE nombre='DEMO' AND apellido='Sofía Ramírez';
  SELECT id INTO v_martin_id FROM empleadas WHERE nombre='DEMO' AND apellido='Martín Gómez';

  -- 3a: aprobar vencimientos con puntaje (feb-jun) -> dispara fn_registrar_puntos_al_aprobar
  UPDATE vencimientos
     SET estado_avance = 'APROBADO', completado = true,
         completado_at = fecha_vencimiento::timestamptz, completado_by = v_admin_id
   WHERE puntos_config_id IS NOT NULL
     AND EXTRACT(MONTH FROM fecha_vencimiento) BETWEEN 2 AND 6
     AND descripcion LIKE '[DEMO]%';

  -- julio queda terminado, pendiente de aprobación (para la pestaña "Para Aprobar")
  UPDATE vencimientos
     SET estado_avance = 'TERMINADO', observaciones_empleada = '[DEMO] listo, falta aprobar'
   WHERE puntos_config_id IS NOT NULL
     AND EXTRACT(MONTH FROM fecha_vencimiento) = 7
     AND descripcion LIKE '[DEMO]%';

  -- vencimientos genéricos de cliente: variar estados
  UPDATE vencimientos
     SET estado_avance = 'APROBADO', completado = true,
         completado_at = fecha_vencimiento::timestamptz, completado_by = v_admin_id
   WHERE puntos_config_id IS NULL AND ambito = 'CLIENTE'
     AND descripcion LIKE '[DEMO]%'
     AND EXTRACT(MONTH FROM fecha_vencimiento) BETWEEN 2 AND 5;

  UPDATE vencimientos
     SET estado_avance = 'TERMINADO'
   WHERE puntos_config_id IS NULL AND ambito = 'CLIENTE'
     AND descripcion LIKE '[DEMO]%'
     AND EXTRACT(MONTH FROM fecha_vencimiento) = 6;
  -- julio queda PENDIENTE (default)

  -- vencimientos del estudio: feb-jun completados
  UPDATE vencimientos
     SET estado_avance = 'APROBADO', completado = true,
         completado_at = fecha_vencimiento::timestamptz, completado_by = v_admin_id
   WHERE ambito = 'ESTUDIO' AND descripcion LIKE '[DEMO]%'
     AND EXTRACT(MONTH FROM fecha_vencimiento) BETWEEN 2 AND 6;

  -- vencimientos personales: feb-mayo completados, jun y jul quedan pendientes/vencidos
  -- (para probar la alerta "impuestos personales sin pagar" del dashboard)
  UPDATE vencimientos
     SET estado_avance = 'APROBADO', completado = true,
         completado_at = fecha_vencimiento::timestamptz, completado_by = v_admin_id
   WHERE ambito = 'PERSONAL' AND descripcion LIKE '[DEMO]%'
     AND EXTRACT(MONTH FROM fecha_vencimiento) BETWEEN 2 AND 5;

  -- 3b: aprobar trabajos_realizados feb-jun (julio queda pendiente)
  FOR v_trabajo IN
    SELECT id, empleada_id, periodo_mes
    FROM trabajos_realizados
    WHERE descripcion LIKE '[DEMO]%' AND periodo_mes BETWEEN 2 AND 6
  LOOP
    IF v_trabajo.empleada_id = v_sofia_id THEN
      PERFORM fn_aprobar_trabajo_realizado(v_trabajo.id, false, NULL);
    ELSE
      PERFORM fn_aprobar_trabajo_realizado(v_trabajo.id, true, 20000 + v_trabajo.periodo_mes * 1500);
    END IF;
  END LOOP;

  -- 3c: Paola descuenta parte del saldo acumulado de Sofía a fin de abril
  PERFORM fn_ajustar_saldo_puntaje(v_sofia_id, 20, 300000, '[DEMO] liquidación parcial abril');

  -- 3d: liquidaciones + recibos por cliente x mes, con variedad de cobro
  FOR v_cliente IN
    SELECT id, nombre,
           CASE WHEN nombre IN ('DEMO Constructora del Sur SRL','DEMO Panadería La Espiga SA')
                THEN 'FC_A' ELSE 'FC_C' END AS tipo_comp,
           row_number() OVER (ORDER BY nombre) AS idx
    FROM clientes WHERE nombre LIKE 'DEMO %'
  LOOP
    FOR v_mes IN 2..7 LOOP
      SELECT monto INTO v_honorario
      FROM honorarios_mensuales
      WHERE cliente_id = v_cliente.id
        AND vigente_desde <= make_date(2026, v_mes, 1)
        AND (vigente_hasta IS NULL OR vigente_hasta >= make_date(2026, v_mes, 1))
      LIMIT 1;

      INSERT INTO liquidaciones (
        cliente_id, tipo_servicio, generado_por, fecha_liquidacion,
        periodo_mes, periodo_anio, importe_liquidado, tipo_comprobante, importe_facturado, notas
      ) VALUES (
        v_cliente.id, 'HONORARIO_MENSUAL', 'PAOLA', make_date(2026, v_mes, 5),
        LPAD(v_mes::text, 2, '0'), 2026, v_honorario, v_cliente.tipo_comp,
        CASE WHEN v_cliente.tipo_comp = 'FC_A' THEN ROUND(v_honorario * 1.21, 2) ELSE v_honorario END,
        '[DEMO]'
      )
      RETURNING id INTO v_liq_id;

      v_combo := ((v_cliente.idx - 1) * 6 + (v_mes - 2)) % 5;

      IF v_combo = 0 THEN
        PERFORM fn_registrar_recibo(
          v_cliente.id, make_date(2026, v_mes, 10), 'TRANSFERENCIA', v_honorario,
          jsonb_build_array(jsonb_build_object('liquidacion_id', v_liq_id, 'importe', v_honorario)),
          NULL, NULL, NULL, 'BANCO_NACION_CA_PESOS', NULL, '[DEMO]'
        );
      ELSIF v_combo = 1 THEN
        PERFORM fn_registrar_recibo(
          v_cliente.id, make_date(2026, v_mes, 10), 'EFECTIVO', v_honorario,
          jsonb_build_array(jsonb_build_object('liquidacion_id', v_liq_id, 'importe', v_honorario)),
          NULL, NULL, NULL, NULL, NULL, '[DEMO]'
        );
      ELSIF v_combo = 2 THEN
        INSERT INTO cheques (tipo, numero, banco, importe, fecha_emision, origen, cliente_id, estado, notas)
        VALUES (
          'TERCERO', 'DEMO-' || v_cliente.idx || '-' || v_mes, 'Banco Santa Fe',
          v_honorario, make_date(2026, v_mes, 10), 'CLIENTE', v_cliente.id, 'EN_CARTERA', '[DEMO]'
        )
        RETURNING id INTO v_cheque_id;

        PERFORM fn_registrar_recibo(
          v_cliente.id, make_date(2026, v_mes, 10), 'CHEQUE', v_honorario,
          jsonb_build_array(jsonb_build_object('liquidacion_id', v_liq_id, 'importe', v_honorario)),
          NULL, NULL, NULL, NULL, v_cheque_id, '[DEMO]'
        );
      ELSIF v_combo = 3 THEN
        PERFORM fn_registrar_recibo(
          v_cliente.id, make_date(2026, v_mes, 10), 'TRANSFERENCIA', ROUND(v_honorario * 0.5, 2),
          jsonb_build_array(jsonb_build_object('liquidacion_id', v_liq_id, 'importe', ROUND(v_honorario * 0.5, 2))),
          NULL, NULL, NULL, 'BANCO_NACION_CA_PESOS', NULL, '[DEMO] pago parcial'
        );
      -- v_combo = 4: sin pago, queda deuda pendiente a propósito
      END IF;
    END LOOP;
  END LOOP;

  -- 3e: variar el estado de los cheques de terceros recibidos
  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY fecha_emision) AS rn
    FROM cheques WHERE notas = '[DEMO]' AND tipo = 'TERCERO'
  )
  UPDATE cheques SET estado = 'DEPOSITADO', fecha_cobro = fecha_emision + 3
  WHERE id IN (SELECT id FROM ranked WHERE rn IN (1, 2));

  UPDATE cheques
     SET acreditacion_confirmada = true, acreditacion_confirmada_at = now(), acreditacion_confirmada_by = v_admin_id
   WHERE notas = '[DEMO]' AND tipo = 'TERCERO' AND estado = 'DEPOSITADO';

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY fecha_emision) AS rn
    FROM cheques WHERE notas = '[DEMO]' AND tipo = 'TERCERO'
  )
  UPDATE cheques SET estado = 'RECHAZADO'
  WHERE id IN (SELECT id FROM ranked WHERE rn = 3);

  -- uno se endosa a un proveedor demo (prueba fn_endosar_cheque_a_proveedor)
  SELECT c.id INTO v_cheque_id
  FROM cheques c
  JOIN (SELECT id, row_number() OVER (ORDER BY fecha_emision) rn FROM cheques WHERE notas='[DEMO]' AND tipo='TERCERO') r
    ON r.id = c.id
  WHERE r.rn = 4;

  SELECT cp.id, cp.importe_total INTO v_compra_target
  FROM compras_proveedores cp
  JOIN proveedores p ON p.id = cp.proveedor_id
  WHERE p.nombre = 'DEMO Papelera Armstrong' AND cp.estado = 'PENDIENTE'
  ORDER BY cp.fecha LIMIT 1;

  PERFORM fn_endosar_cheque_a_proveedor(
    v_cheque_id, v_compra_target.id,
    LEAST(v_compra_target.importe_total, (SELECT importe FROM cheques WHERE id = v_cheque_id)),
    CURRENT_DATE, '[DEMO] endoso de cheque de cliente'
  );
  -- rn 5 y 6 quedan EN_CARTERA sin tocar

  -- 3f: cheque cargado manualmente (prueba fn_registrar_cheque_manual)
  PERFORM fn_registrar_cheque_manual(
    'TERCERO', 'DEMO-MANUAL-001', 'Banco Credicoop', 85000, CURRENT_DATE - 5, NULL,
    (SELECT id FROM clientes WHERE nombre = 'DEMO Juan Martínez'), NULL, NULL,
    '[DEMO] cheque que Paola ya tenía'
  );

  -- 3g: pagos a proveedores por las compras generadas
  FOR v_compra IN
    SELECT cp.id, cp.importe_total, row_number() OVER (ORDER BY cp.fecha) AS rn
    FROM compras_proveedores cp
    JOIN proveedores p ON p.id = cp.proveedor_id
    WHERE p.nombre LIKE 'DEMO %' AND cp.concepto LIKE '[DEMO]%' AND cp.estado <> 'PAGADA'
  LOOP
    IF v_compra.rn % 4 = 0 THEN
      CONTINUE; -- queda pendiente a propósito
    ELSIF v_compra.rn % 4 = 2 THEN
      PERFORM fn_registrar_pago_proveedor(
        v_compra.id, 'EFECTIVO', ROUND(v_compra.importe_total * 0.5, 2), CURRENT_DATE, NULL, NULL, '[DEMO] pago parcial'
      );
    ELSE
      PERFORM fn_registrar_pago_proveedor(
        v_compra.id, 'TRANSFERENCIA', v_compra.importe_total, CURRENT_DATE, 'BANCO_NACION_CA_PESOS', NULL, '[DEMO]'
      );
    END IF;
  END LOOP;

  -- 3h: sueldos de las empleadas demo, mes a mes
  FOR v_mes IN 2..7 LOOP
    INSERT INTO liquidaciones_empleadas (empleada_id, concepto, tipo_concepto, periodo_mes, periodo_anio, importe, observaciones)
    VALUES (v_sofia_id, 'Sueldo', 'HABER', v_mes, 2026, 280000, '[DEMO]');

    INSERT INTO liquidaciones_empleadas (empleada_id, concepto, tipo_concepto, periodo_mes, periodo_anio, importe, observaciones)
    VALUES (v_martin_id, 'Sueldo', 'HABER', v_mes, 2026, 260000, '[DEMO]');

    IF v_mes = 4 THEN
      INSERT INTO liquidaciones_empleadas (empleada_id, concepto, tipo_concepto, periodo_mes, periodo_anio, importe, observaciones)
      VALUES (v_sofia_id, 'Anticipo', 'DESCUENTO', v_mes, 2026, 30000, '[DEMO]');
    END IF;

    INSERT INTO pagos_empleadas (empleada_id, periodo_mes, periodo_anio, tipo_pago, importe, fecha_pago, cuenta_bancaria, notas)
    VALUES (
      v_sofia_id, v_mes, 2026, 'TRANSFERENCIA',
      CASE WHEN v_mes = 4 THEN 250000 ELSE 280000 END,
      make_date(2026, v_mes, 28), 'BANCO_NACION_CA_PESOS', '[DEMO]'
    );

    INSERT INTO pagos_empleadas (empleada_id, periodo_mes, periodo_anio, tipo_pago, importe, fecha_pago, cuenta_bancaria, notas)
    VALUES (v_martin_id, v_mes, 2026, 'TRANSFERENCIA', 260000, make_date(2026, v_mes, 28), 'BANCO_NACION_CA_PESOS', '[DEMO]');
  END LOOP;

END $$;
