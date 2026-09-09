-- ============================================================
-- 0076_vencimientos_meses_especificos.sql
--
-- Pedido de Paola (2026-09-09): los anticipos le aparecen
-- pendientes los 12 meses del año, y no son 12.
--
-- Hoy un trabajo recurrente solo puede ser MENSUAL (los 12 meses,
-- sin excepción — el generador hace `if (MENSUAL) return true`)
-- o ANUAL (un único mes). No hay forma de decir "cae en estos
-- meses y en ninguno más", que es exactamente lo que necesitan
-- los anticipos: 5 al año en persona física, 9 en sociedades.
--
-- Se agrega el tipo MESES_ESPECIFICOS con un array de meses. El
-- día del mes se reutiliza de dia_vencimiento_mensual en vez de
-- crear otra columna: es el mismo dato y ya está validado 1-31.
--
-- Las 87 configuraciones MENSUAL existentes no se tocan; siguen
-- generando los 12 meses hasta que Paola marque los meses reales
-- de cada una (las 20 de ANTICIPOS_DE_GANANCIAS son las que le
-- importan). El calendario depende del cierre fiscal de cada
-- cliente, así que no se puede adivinar desde acá.
-- ============================================================

ALTER TABLE puntos_trabajo_config
  ADD COLUMN IF NOT EXISTS meses_vencimiento SMALLINT[];

-- Habilitar el nuevo tipo
ALTER TABLE puntos_trabajo_config
  DROP CONSTRAINT IF EXISTS puntos_trabajo_config_tipo_vencimiento_check;

ALTER TABLE puntos_trabajo_config
  ADD CONSTRAINT puntos_trabajo_config_tipo_vencimiento_check
  CHECK (tipo_vencimiento IN ('MENSUAL', 'ANUAL', 'MESES_ESPECIFICOS', 'A_DEMANDA'));

-- MESES_ESPECIFICOS necesita al menos un mes y el día del mes.
ALTER TABLE puntos_trabajo_config
  DROP CONSTRAINT IF EXISTS check_meses_especificos_requiere_meses;

ALTER TABLE puntos_trabajo_config
  ADD CONSTRAINT check_meses_especificos_requiere_meses
  CHECK (
    tipo_vencimiento <> 'MESES_ESPECIFICOS'
    OR (
      meses_vencimiento IS NOT NULL
      AND array_length(meses_vencimiento, 1) > 0
      AND dia_vencimiento_mensual IS NOT NULL
    )
  );

-- Los meses tienen que ser meses. Se usa el operador de contención
-- de arrays (<@) porque un CHECK no admite subconsultas, así que
-- unnest() no es una opción acá.
ALTER TABLE puntos_trabajo_config
  DROP CONSTRAINT IF EXISTS check_meses_vencimiento_rango;

ALTER TABLE puntos_trabajo_config
  ADD CONSTRAINT check_meses_vencimiento_rango
  CHECK (
    meses_vencimiento IS NULL
    OR (
      array_length(meses_vencimiento, 1) BETWEEN 1 AND 12
      AND meses_vencimiento <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::SMALLINT[]
    )
  );
