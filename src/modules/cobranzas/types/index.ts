export type TEstadoLiquidacion = 'PENDIENTE' | 'PARCIALMENTE_COBRADA' | 'COBRADA' | 'ANULADA'
export type TTipoPago = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE' | 'USD'

export type TLiquidacion = {
  id: string
  cliente_id: string
  tipo_servicio: string
  generado_por: string | null
  fecha_liquidacion: string
  periodo_mes: string | null
  periodo_anio: number | null
  detalle: string | null
  importe_liquidado: number
  tipo_comprobante: string | null
  nro_comprobante: string | null
  importe_facturado: number | null
  estado: TEstadoLiquidacion
  tipo_liquidacion: 'NORMAL' | 'SALDO_INICIAL'
  notas: string | null
  created_at: string
  updated_at: string
}

export type TRecibo = {
  id: string
  cliente_id: string
  numero_recibo: string | null
  fecha: string
  tipo_pago: TTipoPago
  importe: number
  importe_usd: number | null
  tipo_cambio: number | null
  cuenta_bancaria: string | null
  cheque_id: string | null
  notas: string | null
  anulado: boolean
  anulado_at: string | null
  anulado_by: string | null
  motivo_anulacion: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TReciboDisponible = TRecibo & {
  total_imputado: number
  saldo_libre: number
}

export type TImputacion = {
  id: string
  recibo_id: string
  liquidacion_id: string
  importe: number
  notas: string | null
  created_by: string | null
  created_at: string
}

export type TImputacionDetalle = TImputacion & {
  cliente_id: string
  recibo_fecha: string
  recibo_tipo_pago: TTipoPago
  numero_recibo: string | null
  fecha_liquidacion: string
  tipo_servicio: string
  liquidacion_detalle: string | null
  importe_liquidado: number
}

export type TLiquidacionConImputaciones = TLiquidacion & {
  imputaciones: TImputacion[]
}

export type TCuentaCorriente = {
  cliente_id: string
  cliente_nombre: string
  total_devengado: number
  total_cobrado: number
  total_recibido: number
  total_imputado: number
  saldo_pendiente: number
  saldo_a_favor: number
  liquidaciones_pendientes: number
}

export type TCheque = {
  id: string
  tipo: 'PROPIO' | 'TERCERO'
  numero: string
  banco: string
  importe: number
  fecha_emision: string
  fecha_cobro: string | null
  estado: 'EN_CARTERA' | 'DEPOSITADO' | 'ENDOSADO' | 'RECHAZADO' | 'ANULADO'
  origen: 'CLIENTE' | 'EMITIDO'
  cliente_id: string | null
  cuenta_bancaria: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type TEdadDeuda = '0-30' | '31-60' | '61-90' | '90+'

export type TImputacionInline = {
  liquidacion_id: string
  importe: number
}
