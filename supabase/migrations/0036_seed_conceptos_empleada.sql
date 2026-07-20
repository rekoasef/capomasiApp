-- ============================================================
-- 0036_seed_conceptos_empleada.sql
--
-- Fase 3 del roadmap (docs/funcional/ROADMAP_PENDIENTES.md):
-- el formulario de "Agregar concepto" en liquidaciones de
-- empleadas ya usa un select (no texto libre), pero corría
-- 100% sobre el fallback hardcodeado del frontend porque estas
-- categorías nunca se sembraron en `parametros` (regla #7 de
-- CLAUDE.md: nada de listas hardcodeadas).
-- ============================================================

INSERT INTO parametros (categoria, codigo, descripcion, activo, orden) VALUES
  ('CONCEPTO_HABER_EMPLEADA', 'SUELDO_FIJO',                  'Sueldo fijo',                     TRUE, 1),
  ('CONCEPTO_HABER_EMPLEADA', 'PREMIO',                       'Premio',                          TRUE, 2),
  ('CONCEPTO_HABER_EMPLEADA', 'AGUINALDO',                    'Aguinaldo',                       TRUE, 3),
  ('CONCEPTO_HABER_EMPLEADA', 'VACACIONES',                   'Vacaciones',                      TRUE, 4),
  ('CONCEPTO_HABER_EMPLEADA', 'HONORARIO_ANUAL',              'Honorario anual',                 TRUE, 5),
  ('CONCEPTO_HABER_EMPLEADA', 'ESTADOS_CONTABLES',            'Estados contables',               TRUE, 6),
  ('CONCEPTO_HABER_EMPLEADA', 'GANANCIAS_Y_BIENES_PERSONALES','Ganancias y bienes personales',   TRUE, 7),
  ('CONCEPTO_HABER_EMPLEADA', 'SALDO_TECNICO_IVA',            'Saldo técnico IVA',               TRUE, 8),
  ('CONCEPTO_HABER_EMPLEADA', 'OTRO',                         'Otro',                            TRUE, 9),
  ('CONCEPTO_DESCUENTO_EMPLEADA', 'IIBB',                     'IIBB',                            TRUE, 1),
  ('CONCEPTO_DESCUENTO_EMPLEADA', 'MONOTRIBUTO',              'Monotributo',                     TRUE, 2),
  ('CONCEPTO_DESCUENTO_EMPLEADA', 'OTRO',                     'Otro',                            TRUE, 3)
ON CONFLICT (categoria, codigo) DO NOTHING;
