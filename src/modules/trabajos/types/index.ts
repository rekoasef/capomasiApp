export type TEstadoTrabajo = 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO' | 'COBRADO'

export type TTrabajo = {
  id: string
  cliente_id: string
  tipo_trabajo: string
  anio: number
  honorario: number | null
  tipo_comprobante: string | null
  importe_facturado: number | null
  estado: TEstadoTrabajo
  asignado_a: string | null
  fecha_vencimiento: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type TTrabajoConCliente = TTrabajo & {
  clientes: { nombre: string; cuit: string }
}

export const ESTADO_SIGUIENTE: Record<TEstadoTrabajo, TEstadoTrabajo | null> = {
  PENDIENTE: 'EN_PROCESO',
  EN_PROCESO: 'FINALIZADO',
  FINALIZADO: 'COBRADO',
  COBRADO: null,
}

export const ESTADO_LABEL: Record<TEstadoTrabajo, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  FINALIZADO: 'Finalizado',
  COBRADO: 'Cobrado',
}

export const TIPOS_TRABAJO = [
  { value: 'BALANCE', label: 'Balance' },
  { value: 'GANANCIAS_PF', label: 'Ganancias PF' },
  { value: 'ISIB', label: 'ISIB' },
  { value: 'BIENES_PERSONALES', label: 'Bienes Personales' },
  { value: 'HONORARIO_ANUAL', label: 'Honorario Anual' },
  { value: 'CONSULTORIA_COSTOS', label: 'Consultoría de Costos' },
  { value: 'INSCRIPCIONES', label: 'Inscripciones' },
  { value: 'OTROS', label: 'Otros' },
]
