export type TTipoMovimiento = 'INGRESO' | 'EGRESO' | 'MOVIMIENTO'

// Las cinco cuentas de la caja. Cada una es una columna de importe en
// fondos_movimientos y una tarjeta de saldo en Fondos.
export type TCuentaFondos = 'banco' | 'cheques_cartera' | 'efectivo' | 'usd' | 'taralo'

export interface TFondoMovimiento {
  id: string
  tipo_movimiento: TTipoMovimiento
  fecha: string
  concepto: string
  nro_comprobante: string | null
  cuenta_bancaria: string | null
  importe_banco: number
  importe_efectivo: number
  importe_usd: number
  importe_taralo: number
  importe_cheques_cartera: number
  cheque_id: string | null
  referencia_tipo: string | null
  referencia_id: string | null
  notas: string | null
  created_by: string | null
  created_at: string
}

export interface TSaldoFondos {
  saldo_banco: number
  saldo_efectivo: number
  saldo_usd: number
  saldo_taralo: number
  saldo_cheques_cartera: number
}
