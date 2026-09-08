// Cálculo del mes liquidado a una empleada.
//
// Vive acá y no en el componente porque lo usan dos pantallas: el detalle de
// la empleada y el resumen del período de Liquidación Personal.
//
// El arrastre es la parte que no es obvia. Los períodos no son estancos: lo
// que quedó de un mes pasa al siguiente. Paola le pagó $390.000 a Agustina
// sobre un neto de $383.042 y preguntó "el saldo queda a favor, ¿después
// cómo lo imputo?" — la respuesta es que no lo imputa, se descuenta solo del
// mes que viene.

const CONCEPTO_HORAS = 'Horas trabajadas'

export { CONCEPTO_HORAS }

export type TItemLiquidacion = {
  periodo_anio: number
  periodo_mes: number
  tipo_concepto: string
  importe: number | string
}

export type TItemPago = {
  periodo_anio: number
  periodo_mes: number
  importe: number | string
}

export type TTotalesMes = {
  totalHaberes: number
  totalDescuentos: number
  neto: number
  totalPagado: number
  /** Lo que venía de antes. Positivo: se le debe. Negativo: se le pagó de más. */
  saldoAnterior: number
  /** Lo que falta pagar contando el arrastre. Negativo: quedó pagado de más. */
  pendiente: number
}

function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function esAnterior(
  fila: { periodo_anio: number; periodo_mes: number },
  anio: number,
  mes: number
) {
  if (fila.periodo_anio !== anio) return fila.periodo_anio < anio
  return fila.periodo_mes < mes
}

function esDelMes(fila: { periodo_anio: number; periodo_mes: number }, anio: number, mes: number) {
  return fila.periodo_anio === anio && fila.periodo_mes === mes
}

function sumar(filas: { importe: number | string }[]): number {
  return filas.reduce((acc, f) => acc + Number(f.importe), 0)
}

/**
 * Totales de un período, arrastrando lo que haya quedado de los anteriores.
 * Recibe TODAS las liquidaciones y pagos de la empleada, no solo los del mes:
 * el saldo anterior se calcula sobre el historial completo.
 */
export function calcularLiquidacionMes(
  items: TItemLiquidacion[],
  pagos: TItemPago[],
  anio: number,
  mes: number
): TTotalesMes {
  const delMes = items.filter((i) => esDelMes(i, anio, mes))
  const totalHaberes = sumar(delMes.filter((i) => i.tipo_concepto === 'HABER'))
  const totalDescuentos = sumar(delMes.filter((i) => i.tipo_concepto === 'DESCUENTO'))
  const neto = totalHaberes - totalDescuentos
  const totalPagado = sumar(pagos.filter((p) => esDelMes(p, anio, mes)))

  const anteriores = items.filter((i) => esAnterior(i, anio, mes))
  const netoAnterior =
    sumar(anteriores.filter((i) => i.tipo_concepto === 'HABER')) -
    sumar(anteriores.filter((i) => i.tipo_concepto === 'DESCUENTO'))
  const pagadoAnterior = sumar(pagos.filter((p) => esAnterior(p, anio, mes)))
  const saldoAnterior = netoAnterior - pagadoAnterior

  return {
    totalHaberes: redondear(totalHaberes),
    totalDescuentos: redondear(totalDescuentos),
    neto: redondear(neto),
    totalPagado: redondear(totalPagado),
    saldoAnterior: redondear(saldoAnterior),
    pendiente: redondear(neto + saldoAnterior - totalPagado),
  }
}

/** Importe de un concepto por hora. Redondea a 2 decimales. */
export function calcularImporteHoras(horas: number, valorHora: number): number {
  if (!Number.isFinite(horas) || !Number.isFinite(valorHora)) return 0
  if (horas <= 0 || valorHora <= 0) return 0
  return redondear(horas * valorHora)
}
