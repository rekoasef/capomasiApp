-- La política usuarios_write_admin tenía un subquery inline a la tabla usuarios,
-- causando recursión infinita al evaluar RLS desde PostgREST.
-- Se reemplaza por is_admin() (SECURITY DEFINER) que bypasea RLS.
DROP POLICY "usuarios_write_admin" ON usuarios;
CREATE POLICY "usuarios_write_admin" ON usuarios FOR ALL USING (is_admin());
