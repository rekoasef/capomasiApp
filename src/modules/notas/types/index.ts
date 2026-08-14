export interface TNotaEmpleada {
  id: string
  empleada_id: string
  contenido: string
  creada_por: string | null
  finalizada: boolean
  finalizada_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface TNotaEmpleadaConEmpleada extends TNotaEmpleada {
  empleadas?: { nombre: string; apellido: string | null } | null
}

export type TEstadoNota = 'ACTIVAS' | 'FINALIZADAS' | 'TODAS'

export interface TNotasEmpleadaFilters {
  empleadaId?: string
  estado?: TEstadoNota
}
