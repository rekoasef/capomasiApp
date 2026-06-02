export type THonorarioMensual = {
  id: string
  cliente_id: string
  monto: number
  frecuencia_ajuste_meses: number
  vigente_desde: string
  vigente_hasta: string | null
  porcentaje_ajuste: number | null
  notas: string | null
  creado_por: string | null
  created_at: string
}

export type THonorarioConCliente = THonorarioMensual & {
  clientes: { nombre: string; cuit: string }
}

export type TMesesVencido = {
  honorario: THonorarioMensual
  mesesTranscurridos: number
  mesesVencidos: number
}
