-- Tabla de usuarios (perfil + rol, 1:1 con auth.users)
CREATE TABLE usuarios (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  rol        TEXT NOT NULL CHECK (rol IN ('admin', 'empleada')),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer su propio perfil
CREATE POLICY "usuarios_read_own" ON usuarios
  FOR SELECT USING (auth.uid() = id);

-- Admin puede leer todos los perfiles
CREATE POLICY "usuarios_read_all_admin" ON usuarios
  FOR SELECT USING (is_admin());

-- Admin puede insertar/actualizar/borrar usuarios
CREATE POLICY "usuarios_write_admin" ON usuarios
  FOR ALL USING (is_admin());

-- Trigger: crea registro en usuarios al crear un usuario en auth.users
-- (Alternativa: usar Supabase Hooks o crearlo manualmente al registrar)
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo inserta si no existe ya (previene duplicados)
  INSERT INTO usuarios (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'empleada')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();
