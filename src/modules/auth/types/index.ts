export type TRol = 'admin' | 'empleada'

export type TUsuario = {
  id: string
  nombre: string
  email: string
  rol: TRol
  activo: boolean
  created_at: string
  updated_at: string
}
