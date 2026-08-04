export type TIngresoMensual = {
  mes: string // ISO date — primer día del mes
  cantidad_liquidaciones: number
  total_liquidado: number // ingresos de Paola (base sin IVA)
  total_facturado: number // facturado a clientes (con IVA si FC_A)
  ingreso_base_negro: number // Factura C + Presupuesto (informal, sin IVA)
  facturado_cliente_neto: number // Factura A + B, neto sin IVA
  iva_facturado: number // IVA de Factura A + B
}

export type TResultadoMensual = {
  mes: string
  total_ingresos: number
  gasto_sueldos: number
  gasto_proveedores: number
  gasto_manual_estudio: number
  resultado: number
}

export type TResumenDashboard = {
  mes: string // ISO date — primer día del mes seleccionado (o el actual por default)
  ingresos_mes_actual: number
  facturado_mes_actual: number
  ingreso_base_negro_mes_actual: number
  facturado_cliente_neto_mes_actual: number
  iva_facturado_mes_actual: number
  resultado_mes_actual: TResultadoMensual
  deuda_total_clientes: number
  clientes_deudores: number
  ultimos_6_meses: TIngresoMensual[]
  cola_facturacion: number
  vencimientos_proximos_7_dias: number
  vencimientos_vencidos: number
  impuestos_personales_vencidos: number
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
