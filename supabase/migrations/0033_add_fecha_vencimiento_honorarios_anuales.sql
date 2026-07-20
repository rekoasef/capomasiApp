-- Agrega fecha de vencimiento a trabajos anuales
ALTER TABLE honorarios_anuales
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
