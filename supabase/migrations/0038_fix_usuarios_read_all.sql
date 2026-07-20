-- ============================================================
-- 0038_fix_usuarios_read_all.sql
--
-- CLAUDE.md documenta "usuarios: Todos autenticados leen", pero
-- la política real en la DB (`usuarios_read_own`, de antes de que
-- existieran migraciones versionadas) solo permitía leer la
-- propia fila. Esto quedó expuesto al implementar Fase 5
-- (responsable de cliente): una empleada no podía ver el nombre
-- del responsable si no era ella misma.
--
-- Se agrega una policy adicional (permissive, se combina con OR)
-- usando is_authenticated_user() — SECURITY DEFINER, sin riesgo
-- de recursión (mismo patrón que usuarios_write_admin).
-- ============================================================

CREATE POLICY "usuarios_read_all" ON usuarios
  FOR SELECT USING (is_authenticated_user());
