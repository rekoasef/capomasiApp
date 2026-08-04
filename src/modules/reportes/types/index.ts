export type TIngresoMensual = {
  mes: string
  cantidad_liquidaciones: number
  total_liquidado: number
  total_facturado: number
}

export type TResumenTipo = {
  tipo_servicio: string
  cantidad: number
  total_liquidado: number
  total_facturado: number
}

export type TResumenEmpleada = {
  empleada: string
  cantidad: number
  total_liquidado: number
}

export type TComparativoPeriodo = {
  desde: string
  hasta: string
  cantidad: number
  total_liquidado: number
  total_facturado: number
}

export type TComparativoResultado = {
  periodoA: TComparativoPeriodo
  periodoB: TComparativoPeriodo
}
