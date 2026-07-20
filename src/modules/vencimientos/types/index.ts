// ── Vencimientos fiscales de clientes ────────────────────────────────────────

export type TEstadoAvance = 'PENDIENTE' | 'INICIADO' | 'EN_PROCESO' | 'TERMINADO' | 'APROBADO'

export const ESTADO_AVANCE_LABEL: Record<TEstadoAvance, string> = {
  PENDIENTE: 'Pendiente',
  INICIADO: 'Iniciado',
  EN_PROCESO: 'En proceso',
  TERMINADO: 'Terminado',
  APROBADO: 'Aprobado',
}

// Progresión para empleadas — APROBADO lo gestiona solo el admin
export const ESTADO_AVANCE_SIGUIENTE: Record<TEstadoAvance, TEstadoAvance | null> = {
  PENDIENTE: 'INICIADO',
  INICIADO: 'EN_PROCESO',
  EN_PROCESO: 'TERMINADO',
  TERMINADO: null,
  APROBADO: null,
}

export interface TVencimientoFiscal {
  id: string
  cliente_id: string | null
  empleada_id: string | null
  tipo_vencimiento: string
  fecha_vencimiento: string
  descripcion: string
  ambito: 'CLIENTE' | 'ESTUDIO' | 'PERSONAL'
  completado: boolean
  completado_at: string | null
  completado_by: string | null
  estado_avance: TEstadoAvance
  observaciones_empleada: string | null
  facturado: boolean
  liquidacion_id: string | null
  puntos_config_id: string | null
  puntos_snapshot: number | null
  notas: string | null
  created_by: string | null
  created_at: string
}

export interface TVencimientoFiscalConCliente extends TVencimientoFiscal {
  clientes: { nombre: string; cuit: string } | null
  empleadas: { nombre: string; apellido: string | null } | null
}

export interface TVencimientosFiscalesFilters {
  mes?: number
  anio?: number
  empleadaId?: string
  estadoAvance?: TEstadoAvance | 'TODOS'
  soloSinFacturar?: boolean
  ambito?: 'CLIENTE' | 'ESTUDIO'
}

// ── Gastos recurrentes de Paola ───────────────────────────────────────────────

export type TMedioPagoGasto = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE' | 'TARJETA'

export const MEDIOS_PAGO_GASTO: { value: TMedioPagoGasto; label: string }[] = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA', label: 'Tarjeta' },
]

export interface TCategoriaGasto {
  id: string
  nombre: string
  color: string | null
  activo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TGastoRecurrente {
  id: string
  categoria_id: string
  descripcion: string
  dia_vencimiento: number
  proxima_fecha_vencimiento: string
  activo: boolean
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  categorias_gastos?: Pick<TCategoriaGasto, 'nombre' | 'color' | 'activo'> | null
}

export interface TPagoGasto {
  id: string
  categoria_id: string
  gasto_recurrente_id: string | null
  concepto: string
  fecha_pago: string
  medio_pago: TMedioPagoGasto
  importe: number
  fecha_vencimiento_pagado: string | null
  comprobante_url: string | null
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TProximoVencimiento {
  gasto_id: string
  descripcion: string
  proxima_fecha_vencimiento: string
  dia_vencimiento: number
  categoria_id: string
  categoria_nombre: string
  categoria_color: string | null
  dias_restantes: number
}

export interface TPagoGastoDetalle {
  id: string
  concepto: string
  fecha_pago: string
  medio_pago: TMedioPagoGasto
  importe: number
  notas: string | null
  comprobante_url: string | null
  fecha_vencimiento_pagado: string | null
  categoria_id: string
  categoria_nombre: string
  categoria_color: string | null
  gasto_recurrente_id: string | null
  gasto_descripcion: string | null
  anio: number
  mes: number
}

export interface TPagosGastosFilters {
  desde?: string
  hasta?: string
  categoriaId?: string
  gastoRecurrenteId?: string
  anio?: number
  mes?: number
}

export interface TResumenCategoria {
  categoria_id: string
  categoria_nombre: string
  categoria_color: string | null
  total: number
  cantidad: number
}

export interface TResumenGasto {
  gasto_recurrente_id: string | null
  gasto_descripcion: string
  categoria_id: string
  categoria_nombre: string
  total: number
  cantidad: number
}

export interface TResumenMensualGasto {
  gasto_recurrente_id: string | null
  gasto_descripcion: string
  mes: number
  total: number
  cantidad: number
}

export interface TResumenAnualGastos {
  anio: number
  total: number
  porCategoria: TResumenCategoria[]
  porGasto: TResumenGasto[]
  mensualPorGasto: TResumenMensualGasto[]
}
