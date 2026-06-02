import type { TImputacion, TEdadDeuda } from '../types'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function calcularSaldoPendiente(
  importeLiquidado: number,
  imputaciones: Pick<TImputacion, 'importe'>[]
): number {
  const totalImputado = imputaciones.reduce((sum, i) => sum + i.importe, 0)
  return Math.max(0, round2(importeLiquidado - totalImputado))
}

export function calcularTotalImputado(imputaciones: Pick<TImputacion, 'importe'>[]): number {
  return round2(imputaciones.reduce((sum, i) => sum + i.importe, 0))
}

export function calcularSaldoLibreRecibo(
  importeRecibo: number,
  imputaciones: Pick<TImputacion, 'importe'>[]
): number {
  const totalImputado = imputaciones.reduce((sum, i) => sum + i.importe, 0)
  return Math.max(0, round2(importeRecibo - totalImputado))
}

export function calcularImportePagoUSD(importeUsd: number, tipoCambio: number): number {
  return round2(importeUsd * tipoCambio)
}

export function diasDesdeEmision(fechaLiquidacion: string): number {
  const fecha = new Date(fechaLiquidacion)
  const hoy = new Date()
  const diff = hoy.getTime() - fecha.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function categorizarEdadDeuda(dias: number): TEdadDeuda {
  if (dias <= 30) return '0-30'
  if (dias <= 60) return '31-60'
  if (dias <= 90) return '61-90'
  return '90+'
}
