-- Helper: el usuario activo es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: el usuario está registrado y activo en el sistema
CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND activo = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
