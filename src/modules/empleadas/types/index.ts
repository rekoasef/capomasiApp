export type TTipoRelacion = 'DEPENDENCIA' | 'POR_HORA'
export type TTipoConcepto = 'HABER' | 'DESCUENTO'
export type TTipoPagoEmpleada = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE'
export type TTipoComision = 'PRODUCCION' | 'PUNTAJE' | 'HORAS' | 'NINGUNA'
export type TTipoCalculo = 'PORCENTAJE' | 'MONTO_FIJO' | 'VALOR_HORA'

export interface TEmpleada {
  id: string
  usuario_id: string | null
  nombre: string
  apellido: string | null
  tipo_relacion: TTipoRelacion
  tipo_comision: TTipoComision
  activo: boolean
  // Datos personales
  fecha_nacimiento: string | null
  dni: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  localidad: string | null
  cbu: string | null
  alias_cbu: string | null
  // Datos laborales
  fecha_ingreso: string | null
  sueldo_fijo: number | null
  /** Valor hora vigente (empleadas POR_HORA). Se copia a cada liquidación. */
  valor_hora: number | null
  // Sistema
  deleted_at: string | null
  created_at: string
}

export interface TLiquidacionEmpleada {
  id: string
  empleada_id: string
  concepto: string
  tipo_concepto: TTipoConcepto
  periodo_mes: number
  periodo_anio: number
  importe: number
  observaciones: string | null
  /** Solo en el concepto "Horas trabajadas"; null en los de importe plano. */
  cantidad_horas: number | null
  /** Valor hora con el que se liquidó ese mes. Congelado. */
  valor_hora: number | null
  created_at: string
  empleadas?: { nombre: string }
}

export interface TPagoEmpleada {
  id: string
  empleada_id: string
  periodo_mes: number
  periodo_anio: number
  tipo_pago: TTipoPagoEmpleada
  importe: number
  fecha_pago: string
  cuenta_bancaria: string | null
  cheque_id: string | null
  notas: string | null
  created_at: string
}

export interface TResumenPeriodo {
  empleada_id: string
  empleada_nombre: string
  periodo_mes: number
  periodo_anio: number
  total_haberes: number
  total_descuentos: number
  neto: number
  total_pagado: number
  /** Lo que venía de meses anteriores. Positivo: se le debe. Negativo: se le pagó de más. */
  saldo_anterior: number
  /** Lo que falta pagar contando el arrastre. */
  saldo: number
}

export interface TTrabajoRealizado {
  id: string
  empleada_id: string
  fecha: string
  cliente_id: string | null
  tipo_trabajo: string
  descripcion: string
  genera_comision: boolean
  importe_comision: number | null
  periodo_mes: number
  periodo_anio: number
  aprobado_por: string | null
  aprobado_at: string | null
  liquidacion_empleada_id: string | null
  created_at: string
  updated_at: string
}

export interface TTrabajoRealizadoDetalle extends TTrabajoRealizado {
  empleadas?: { nombre: string; tipo_comision: string } | null
  clientes?: { nombre: string } | null
  liquidaciones_empleadas?: {
    id: string
    concepto: string
    importe: number
  } | null
}

// ── Comisiones ────────────────────────────────────────────────

export interface TComisionConfig {
  id: string
  empleada_id: string
  tipo_calculo: TTipoCalculo
  valor: number
  umbral_puntaje: number | null
  vigente_desde: string
  created_at: string
}

export interface TRegistroPuntaje {
  id: string
  empleada_id: string
  periodo_mes: number
  periodo_anio: number
  descripcion: string
  puntos: number
  tipo_trabajo: string | null
  valor_generado: number | null
  created_by: string | null
  created_at: string
}

export type TTipoVencimientoConfig = 'MENSUAL' | 'ANUAL' | 'MESES_ESPECIFICOS' | 'A_DEMANDA'

export interface TPuntosTrabajoConfig {
  id: string
  cliente_id: string
  tipo_trabajo: string
  puntos: number
  activo: boolean
  facturar_aparte: boolean
  empleada_id: string | null
  tipo_vencimiento: TTipoVencimientoConfig
  meses_vencimiento: number[] | null
  dia_vencimiento_mensual: number | null
  mes_vencimiento_anual: number | null
  dia_vencimiento_anual: number | null
  created_at: string
  clientes?: { nombre: string } | null
  empleadas?: { nombre: string; apellido: string | null } | null
}

export interface TValoresPuntoTipo {
  id: string
  tipo_trabajo: string
  valor_por_punto: number
  vigente_desde: string
  created_at: string
}

// valor_acumulado es la plata real que quedó pendiente de pagar, en
// paralelo a puntos_acumulados — cada punto guarda su valor en pesos
// al generarse (fn_calcular_valor_generado_puntaje) y ambos contadores
// bajan juntos al descontar (fn_ajustar_saldo_puntaje), no se recalcula
// un promedio sobre el historial completo.
export interface TSaldoPuntaje {
  empleada_id: string
  puntos_acumulados: number
  valor_acumulado: number
  updated_at: string
}

export interface TRegistroHoras {
  id: string
  empleada_id: string
  fecha: string
  horas: number
  descripcion: string | null
  periodo_mes: number
  periodo_anio: number
  created_at: string
}

export interface TResumenComisionHoras {
  total_horas: number
  valor_hora: number
  total_pagar: number
}
