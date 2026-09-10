import type { TIngresoMensual } from '../types'

// Los datos del sistema arrancan en noviembre de 2025: antes de eso no hay ni
// liquidaciones reales ni facturación migrada del Excel. Los presets del
// comparativo se recortan contra este piso para no ofrecer rangos vacíos, que
// era lo que hacía que Paola viera $0,00 y creyera que estaba roto.
export const PRIMER_MES_CON_DATOS = '2025-11-01'

export type TResumenPeriodo = {
  totalLiquidado: number
  totalFacturado: number
  cantidad: number
  promedioMensual: number
  mesPico: { mes: string; total: number } | null
}

export function calcularResumen(rows: TIngresoMensual[]): TResumenPeriodo {
  if (!rows.length) {
    return {
      totalLiquidado: 0,
      totalFacturado: 0,
      cantidad: 0,
      promedioMensual: 0,
      mesPico: null,
    }
  }

  let totalLiquidado = 0
  let totalFacturado = 0
  let cantidad = 0
  let mesPico = rows[0]

  for (const r of rows) {
    totalLiquidado += r.total_liquidado
    totalFacturado += r.total_facturado
    cantidad += r.cantidad_liquidaciones
    if (r.total_liquidado > mesPico.total_liquidado) mesPico = r
  }

  return {
    totalLiquidado,
    totalFacturado,
    cantidad,
    // Promedio sobre los meses que tienen movimiento, no sobre 12: dividir por
    // el año entero achicaría el promedio de un año que recién empieza.
    promedioMensual: totalLiquidado / rows.length,
    mesPico: { mes: mesPico.mes, total: mesPico.total_liquidado },
  }
}

// El IVA (o el recargo de facturación) es lo que separa la base facturada del
// total del comprobante. Se grafica apilado sobre la base porque las dos partes
// suman el importe facturado; nunca es negativo en los datos reales, pero se
// recorta en cero por si un importe cargado a mano quedara al revés.
export type TBarraMensual = {
  mes: string
  etiqueta: string
  base: number
  iva: number
  facturado: number
  cantidad: number
}

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

export function construirBarrasMensuales(rows: TIngresoMensual[]): TBarraMensual[] {
  return rows.map((r) => {
    const [anio, mes] = r.mes.split('-')
    const indice = Number(mes) - 1
    return {
      mes: r.mes,
      etiqueta: `${MESES_CORTOS[indice] ?? mes} ${anio.slice(2)}`,
      base: r.total_liquidado,
      iva: Math.max(0, r.total_facturado - r.total_liquidado),
      facturado: r.total_facturado,
      cantidad: r.cantidad_liquidaciones,
    }
  })
}

/**
 * Los tipos de servicio que vinieron del Excel y todavía no tienen equivalente
 * en `parametros` llegan como código crudo (`SALDO_TECNICO_DE_IVA`). Mapearlos
 * es decisión de Paola y sigue pendiente; mientras tanto se los muestra
 * legibles en vez de en mayúsculas con guiones bajos. Esto es solo presentación:
 * no toca el dato ni resuelve el mapeo.
 */
export function humanizarCodigo(codigo: string): string {
  if (!/^[A-Z0-9_.]+$/.test(codigo)) return codigo
  const texto = codigo.replace(/_/g, ' ').toLowerCase().trim()
  if (!texto) return codigo
  // "iva" y "afip" son siglas: se dejan en mayúscula.
  const conSiglas = texto.replace(/\b(iva|afip|anses|sac|cuit)\b/g, (s) => s.toUpperCase())
  return conSiglas.charAt(0).toUpperCase() + conSiglas.slice(1)
}

export type TItemRanking = {
  clave: string
  etiqueta: string
  total: number
  cantidad: number
  participacion: number
}

export function construirRanking(
  items: { clave: string; etiqueta: string; total: number; cantidad: number }[]
): TItemRanking[] {
  const suma = items.reduce((acc, i) => acc + i.total, 0)
  return [...items]
    .sort((a, b) => b.total - a.total)
    .map((i) => ({
      ...i,
      participacion: suma > 0 ? (i.total / suma) * 100 : 0,
    }))
}

// ── Presets del comparativo ──────────────────────────────────────────────────

export type TRangoFechas = { desde: string; hasta: string }
export type TPresetComparativo = {
  id: string
  etiqueta: string
  a: TRangoFechas
  b: TRangoFechas
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function primerDia(anio: number, mes: number): string {
  return iso(new Date(anio, mes, 1))
}

function ultimoDia(anio: number, mes: number): string {
  return iso(new Date(anio, mes + 1, 0))
}

/**
 * Los cuatro rangos que Paola pide en la práctica. Se calculan contra una fecha
 * inyectable para poder testearlos sin depender de "hoy".
 */
export function construirPresetsComparativo(hoy = new Date()): TPresetComparativo[] {
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()

  const mesAnteriorFecha = new Date(anio, mes - 1, 1)
  const anioAnterior = anio - 1

  const inicioTrimestre = new Date(anio, mes - 2, 1)
  const inicioTrimestreAnterior = new Date(anio, mes - 5, 1)

  return [
    {
      id: 'mes-vs-anterior',
      etiqueta: 'Este mes vs. el anterior',
      a: { desde: primerDia(anio, mes), hasta: iso(hoy) },
      b: {
        desde: primerDia(mesAnteriorFecha.getFullYear(), mesAnteriorFecha.getMonth()),
        hasta: ultimoDia(mesAnteriorFecha.getFullYear(), mesAnteriorFecha.getMonth()),
      },
    },
    {
      id: 'mes-vs-anio-pasado',
      etiqueta: 'Este mes vs. el mismo del año pasado',
      a: { desde: primerDia(anio, mes), hasta: iso(hoy) },
      b: { desde: primerDia(anioAnterior, mes), hasta: ultimoDia(anioAnterior, mes) },
    },
    {
      id: 'trimestre',
      etiqueta: 'Últimos 3 meses vs. los 3 anteriores',
      a: {
        desde: primerDia(inicioTrimestre.getFullYear(), inicioTrimestre.getMonth()),
        hasta: iso(hoy),
      },
      b: {
        desde: primerDia(inicioTrimestreAnterior.getFullYear(), inicioTrimestreAnterior.getMonth()),
        hasta: ultimoDia(inicioTrimestre.getFullYear(), inicioTrimestre.getMonth() - 1),
      },
    },
    {
      id: 'anio',
      etiqueta: 'Este año vs. el pasado',
      a: { desde: primerDia(anio, 0), hasta: iso(hoy) },
      b: { desde: primerDia(anioAnterior, 0), hasta: ultimoDia(anioAnterior, 11) },
    },
  ]
}

/**
 * Un rango que termina antes del primer dato cargado no es un error del sistema:
 * simplemente no hay nada que comparar. La UI lo avisa en vez de mostrar $0,00 a
 * secas, que fue lo que confundió a Paola el 2026-09-10.
 */
export function rangoSinDatosPosibles(rango: TRangoFechas): boolean {
  return rango.hasta < PRIMER_MES_CON_DATOS
}
