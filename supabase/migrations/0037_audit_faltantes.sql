-- ============================================================
-- 0037_audit_faltantes.sql
--
-- Fase 4 del roadmap (docs/funcional/ROADMAP_PENDIENTES.md):
-- fn_audit_trigger ya existe (0004_audit.sql) y está aplicado en
-- cobranzas, honorarios, recibos_imputaciones, trabajos_realizados
-- y gastos_categorias, pero no en estas 5 tablas sensibles.
-- ============================================================

CREATE TRIGGER audit_empleadas
  AFTER INSERT OR UPDATE OR DELETE ON empleadas
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_liquidaciones_empleadas
  AFTER INSERT OR UPDATE OR DELETE ON liquidaciones_empleadas
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_pagos_empleadas
  AFTER INSERT OR UPDATE OR DELETE ON pagos_empleadas
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_proveedores
  AFTER INSERT OR UPDATE OR DELETE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_vencimientos
  AFTER INSERT OR UPDATE OR DELETE ON vencimientos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
