export type TAccionAudit = 'INSERT' | 'UPDATE' | 'DELETE'

export interface TAuditLog {
  id: number
  usuario_id: string | null
  tabla_afectada: string
  registro_id: string
  accion: TAccionAudit
  valor_anterior: Record<string, unknown> | null
  valor_nuevo: Record<string, unknown> | null
  created_at: string
  usuarios?: { nombre: string } | null
}
