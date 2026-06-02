export type TCliente = {
  id: string
  nombre: string
  cuit: string
  domicilio: string | null
  telefono: string | null
  email: string | null
  localidad: string | null
  responsable_id: string | null
  notas: string | null
  activo: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type TClienteForm = {
  nombre: string
  cuit: string
  domicilio?: string
  telefono?: string
  email?: string
  localidad?: string
  notas?: string
}

export type TClave = {
  id: string
  cliente_id: string
  tipo: string
  usuario: string | null
  clave: string
  notas: string | null
  updated_at: string
  updated_by: string | null
}

export type TClaveForm = {
  tipo: string
  usuario?: string
  clave: string
  notas?: string
}
