export type TIngresoMensual = {
  mes: string // ISO date — primer día del mes
  cantidad_liquidaciones: number
  total_liquidado: number // ingresos de Paola (base sin IVA)
  total_facturado: number // facturado a clientes (con IVA si FC_A)
}

export type TResumenDashboard = {
  ingresos_mes_actual: number
  facturado_mes_actual: number
  deuda_total_clientes: number
  clientes_deudores: number
  ultimos_6_meses: TIngresoMensual[]
  trabajos_pendientes: number
  trabajos_en_proceso: number
  cola_facturacion: number
  vencimientos_proximos_7_dias: number
  vencimientos_vencidos: number
}

export type TResumenEmpleadaDashboard = {
  mis_pendientes: number
  mis_en_proceso: number
  mis_terminados_mes: number
  mis_puntos_mes: number
  vencimientos_proximos: TVencimientoResumen[]
}

export type TVencimientoResumen = {
  id: string
  descripcion: string
  cliente_nombre: string
  fecha_vencimiento: string
  estado_avance: string
  dias_restantes: number
}
