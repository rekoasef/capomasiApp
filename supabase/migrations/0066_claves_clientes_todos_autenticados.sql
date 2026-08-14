-- Paola pidió que las empleadas también puedan ver y editar las claves fiscales
-- (AFIP/ANSES) de todos los clientes, no solo el admin. Se reemplaza la política
-- "solo admin" por acceso completo para cualquier usuario autenticado.
-- Pedido de Paola, 2026-08-14.
DROP POLICY "claves_solo_admin" ON claves_clientes;
CREATE POLICY "claves_clientes_todos" ON claves_clientes
  FOR ALL USING (is_authenticated_user()) WITH CHECK (is_authenticated_user());
