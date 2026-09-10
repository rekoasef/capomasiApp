import { parseDateOnly, toLocalDateInputValue } from '@/shared/utils/dates'

const MS_PER_DAY = 86_400_000

function formatDateOnly(date: Date): string {
  return toLocalDateInputValue(date)
}

// Dónde cae el próximo vencimiento de un gasto recurrente es regla de la DB
// (fn_calcular_proxima_fecha_gasto + trg_gastos_recurrentes_proxima_fecha). Tenerla
// también acá hacía que el cliente pisara la fecha y reviviera gastos ya pagados.

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
