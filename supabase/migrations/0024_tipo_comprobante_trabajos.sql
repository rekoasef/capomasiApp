-- ============================================================
-- 0024_tipo_comprobante_trabajos.sql
-- Agrega tipo_comprobante e importe_facturado a honorarios_anuales
-- para que la lógica FC_A (+21% IVA) aplique a todos los trabajos.
-- ============================================================

ALTER TABLE honorarios_anuales
  ADD COLUMN IF NOT EXISTS tipo_comprobante TEXT,
  ADD COLUMN IF NOT EXISTS importe_facturado NUMERIC(14,2);

-- Trigger: recalcular importe_facturado en INSERT/UPDATE
CREATE OR REPLACE FUNCTION fn_honorario_anual_auto_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.honorario IS NOT NULL THEN
    NEW.importe_facturado := fn_calcular_importe_facturado(
      NEW.honorario,
      NEW.tipo_comprobante
    );
  ELSE
    NEW.importe_facturado := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_honorario_anual_auto_fields ON honorarios_anuales;
CREATE TRIGGER trigger_honorario_anual_auto_fields
  BEFORE INSERT OR UPDATE ON honorarios_anuales
  FOR EACH ROW
  EXECUTE FUNCTION fn_honorario_anual_auto_fields();

-- Backfill de filas existentes
UPDATE honorarios_anuales
   SET importe_facturado = fn_calcular_importe_facturado(honorario, tipo_comprobante)
 WHERE honorario IS NOT NULL;
