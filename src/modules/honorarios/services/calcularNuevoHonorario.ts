import { parseDateOnly } from '@/shared/utils/dates'

export function calcularNuevoHonorario(monto: number, porcentaje: number): number {
  if (monto < 0) throw new Error('El monto no puede ser negativo')
  return Math.round((monto * (1 + porcentaje / 100) + Number.EPSILON) * 100) / 100
}

export function mesesDesdeAjuste(vigenteDesdeDateStr: string): number {
  const desde = parseDateOnly(vigenteDesdeDateStr)
  const hoy = new Date()
  return (hoy.getFullYear() - desde.getFullYear()) * 12 + (hoy.getMonth() - desde.getMonth())
}

export function estaVencidoAjuste(
  mesesTranscurridos: number,
  frecuenciaAjusteMeses: number
): boolean {
  return mesesTranscurridos >= frecuenciaAjusteMeses
}
