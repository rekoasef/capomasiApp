import { parseDateOnly, toLocalDateInputValue } from '@/shared/utils/dates'

const MS_PER_DAY = 86_400_000

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function formatDateOnly(date: Date): string {
  return toLocalDateInputValue(date)
}

export function calcularProximaFechaVencimiento(diaVencimiento: number, desde = new Date()): string {
  const base = new Date(desde.getFullYear(), desde.getMonth(), 1)
  let year = base.getFullYear()
  let month = base.getMonth()
  let day = Math.min(diaVencimiento, daysInMonth(year, month))
  let candidate = new Date(year, month, day)

  if (candidate < new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
    day = Math.min(diaVencimiento, daysInMonth(year, month))
    candidate = new Date(year, month, day)
  }

  return formatDateOnly(candidate)
}

export function avanzarFechaVencimiento(fechaActual: string, diaVencimiento: number): string {
  const actual = parseDateOnly(fechaActual)
  let year = actual.getFullYear()
  let month = actual.getMonth() + 1

  if (month > 11) {
    month = 0
    year += 1
  }

  const day = Math.min(diaVencimiento, daysInMonth(year, month))
  return formatDateOnly(new Date(year, month, day))
}

export function calcularDiasRestantes(fecha: string, desde = new Date()): number {
  const today = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  const target = parseDateOnly(fecha)
  return Math.ceil((target.getTime() - today.getTime()) / MS_PER_DAY)
}

export function getMonthRange(anio: number, mes: number): { desde: string; hasta: string } {
  const desde = new Date(anio, mes - 1, 1)
  const hasta = new Date(anio, mes, 0)
  return { desde: formatDateOnly(desde), hasta: formatDateOnly(hasta) }
}
