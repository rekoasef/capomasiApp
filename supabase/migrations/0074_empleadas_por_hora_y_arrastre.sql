-- ============================================================
-- 0074_empleadas_por_hora_y_arrastre.sql
--
-- Dos pedidos de Paola (2026-09-08), apenas empezo a liquidarle a
-- las empleadas:
--
-- 1) "ESTA ES POR HORA PERO NO TENGO ESA OPCION". El legajo ya
--    tiene `tipo_relacion = 'POR_HORA'` -- 4 de las 5 empleadas
--    estan cargadas asi -- pero la liquidacion solo ofrecia
--    conceptos de importe plano. Termino haciendo la cuenta a
--    mano (46 x 8327 = 383.042), cargandola como "Sueldo fijo" y
--    explicandose en observaciones: "46 HORAS A 8327 DESDE AGOSTO
--    DE 2026".
--
--    Se agrega el concepto "Horas trabajadas" y las columnas para
--    guardar horas y valor hora. El valor vigente vive en el
--    legajo (empleadas.valor_hora) y se copia a cada fila de
--    liquidacion al cargarla: asi el historial sale solo, cada mes
--    conserva el valor con el que se liquido y cambiar el valor de
--    hoy no reescribe los meses viejos.
--
-- 2) "Y EL SALDO QUEDA A FAVOR, DESPUES COMO LO IMPUTO?". Le pago
--    390.000 sobre un neto de 383.042 y quedaron 6.958 a favor de
--    ella. El arrastre entre meses es puro calculo y se resuelve
--    en el service (calcularLiquidacionMes), no hace falta tocar
--    el schema: el saldo de los periodos anteriores sale de sumar
--    las mismas filas que ya existen.
--
-- Nada de esto rompe lo cargado: las columnas son nullable y hoy
-- hay una sola liquidacion y un solo pago en todo el modulo.
-- ============================================================

-- ============================================================
-- 1) Valor hora vigente, en el legajo
-- ============================================================
ALTER TABLE empleadas
  ADD COLUMN IF NOT EXISTS valor_hora NUMERIC(14,2);

ALTER TABLE empleadas DROP CONSTRAINT IF EXISTS empleadas_valor_hora_check;
ALTER TABLE empleadas ADD CONSTRAINT empleadas_valor_hora_check
  CHECK (valor_hora IS NULL OR valor_hora > 0);

COMMENT ON COLUMN empleadas.valor_hora IS
  'Valor hora vigente para empleadas POR_HORA. Se copia a liquidaciones_empleadas al liquidar; cambiarlo no afecta meses ya liquidados.';

-- ============================================================
-- 2) Horas y valor hora en cada fila de liquidacion
-- ============================================================
ALTER TABLE liquidaciones_empleadas
  ADD COLUMN IF NOT EXISTS cantidad_horas NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_hora     NUMERIC(14,2);

ALTER TABLE liquidaciones_empleadas DROP CONSTRAINT IF EXISTS liquidaciones_empleadas_horas_check;
ALTER TABLE liquidaciones_empleadas ADD CONSTRAINT liquidaciones_empleadas_horas_check
  CHECK (
    (cantidad_horas IS NULL AND valor_hora IS NULL)
    OR (cantidad_horas > 0 AND valor_hora > 0)
  );

COMMENT ON COLUMN liquidaciones_empleadas.cantidad_horas IS
  'Horas liquidadas en el concepto "Horas trabajadas". NULL en conceptos de importe plano.';
COMMENT ON COLUMN liquidaciones_empleadas.valor_hora IS
  'Valor hora con el que se liquido ese mes. Congelado: es el historial.';

-- ============================================================
-- 3) El concepto nuevo
--
--    Ojo: el select de conceptos usa `descripcion` como value (no
--    `codigo`), asi que lo que se guarda en liquidaciones_empleadas
--    .concepto es el texto "Horas trabajadas". Cambiar esa
--    descripcion rompe la deteccion en el formulario.
--
--    orden 0 para que aparezca primero: casi todas las empleadas
--    de Paola son por hora.
-- ============================================================
INSERT INTO parametros (categoria, codigo, descripcion, activo, orden)
SELECT 'CONCEPTO_HABER_EMPLEADA', 'HORAS_TRABAJADAS', 'Horas trabajadas', TRUE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM parametros
   WHERE categoria = 'CONCEPTO_HABER_EMPLEADA'
     AND codigo = 'HORAS_TRABAJADAS'
);
