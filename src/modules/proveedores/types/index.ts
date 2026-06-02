export type TEstadoCompra = 'PENDIENTE' | 'PAGADA' | 'PARCIALMENTE_PAGADA' | 'ANULADA'
export type TTipoPagoProveedor = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE'

export interface TProveedor {
  id: string
  nombre: string
  cuit: string | null
  rubro: string | null
  telefono: string | null
  email: string | null
  notas: string | null
  activo: boolean
  deleted_at: string | null
  created_at: string
}

export interface TCompraProveedor {
  id: string
  proveedor_id: string
  fecha: string
  concepto: string
  nro_comprobante: string | null
  tipo_comprobante: string | null
  importe_total: number
  estado: TEstadoCompra
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  proveedores?: { nombre: string }
}

export interface TPagoProveedor {
  id: string
  compra_id: string
  tipo_pago: TTipoPagoProveedor
  importe: number
  fecha_pago: string
  cuenta_bancaria: string | null
  cheque_id: string | null
  notas: string | null
  created_at: string
}
