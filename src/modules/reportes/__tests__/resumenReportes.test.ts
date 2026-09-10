import {
  PRIMER_MES_CON_DATOS,
  calcularResumen,
  construirBarrasMensuales,
  construirPresetsComparativo,
  construirRanking,
  humanizarCodigo,
  rangoSinDatosPosibles,
} from '../services/resumenReportes'
import type { TIngresoMensual } from '../types'

const mes = (m: string, liquidado: number, facturado: number, cantidad = 1): TIngresoMensual => ({
  mes: m,
  total_liquidado: liquidado,
  total_facturado: facturado,
  cantidad_liquidaciones: cantidad,
})

describe('calcularResumen', () => {
  it('suma los totales y promedia sobre los meses con movimiento', () => {
    const r = calcularResumen([mes('2026-01-01', 100, 121, 3), mes('2026-02-01', 300, 363, 5)])

    expect(r.totalLiquidado).toBe(400)
    expect(r.totalFacturado).toBe(484)
    expect(r.cantidad).toBe(8)
    // 400 / 2 meses, no 400 / 12
    expect(r.promedioMensual).toBe(200)
  })

  it('identifica el mes pico por importe base', () => {
    const r = calcularResumen([
      mes('2026-01-01', 100, 121),
      mes('2026-02-01', 900, 1089),
      mes('2026-03-01', 300, 363),
    ])

    expect(r.mesPico).toEqual({ mes: '2026-02-01', total: 900 })
  })

  it('devuelve ceros sin romperse cuando no hay filas', () => {
    const r = calcularResumen([])

    expect(r.totalLiquidado).toBe(0)
    expect(r.promedioMensual).toBe(0)
    expect(r.mesPico).toBeNull()
  })
})

describe('construirBarrasMensuales', () => {
  it('separa el IVA como la diferencia contra la base', () => {
    const [barra] = construirBarrasMensuales([mes('2026-04-01', 1000, 1210, 2)])

    expect(barra.base).toBe(1000)
    expect(barra.iva).toBe(210)
    expect(barra.facturado).toBe(1210)
    expect(barra.etiqueta).toBe('abr 26')
  })

  it('no genera IVA negativo si el facturado quedó por debajo de la base', () => {
    const [barra] = construirBarrasMensuales([mes('2026-04-01', 1000, 900)])

    expect(barra.iva).toBe(0)
  })

  it('deja el IVA en cero cuando el comprobante no discrimina', () => {
    const [barra] = construirBarrasMensuales([mes('2026-05-01', 500, 500)])

    expect(barra.iva).toBe(0)
  })
})

describe('construirRanking', () => {
  it('ordena de mayor a menor y calcula la participación', () => {
    const r = construirRanking([
      { clave: 'a', etiqueta: 'A', total: 250, cantidad: 1 },
      { clave: 'b', etiqueta: 'B', total: 750, cantidad: 3 },
    ])

    expect(r.map((i) => i.clave)).toEqual(['b', 'a'])
    expect(r[0].participacion).toBe(75)
    expect(r[1].participacion).toBe(25)
  })

  it('no divide por cero cuando todos los totales son cero', () => {
    const r = construirRanking([{ clave: 'a', etiqueta: 'A', total: 0, cantidad: 0 }])

    expect(r[0].participacion).toBe(0)
  })
})

describe('humanizarCodigo', () => {
  it('convierte un código del Excel en texto legible', () => {
    expect(humanizarCodigo('CERTIFICACION_DE_BALANCE')).toBe('Certificacion de balance')
    expect(humanizarCodigo('BONOS_BIENES_DE_CAPITAL')).toBe('Bonos bienes de capital')
  })

  it('deja las siglas en mayúscula', () => {
    expect(humanizarCodigo('SALDO_TECNICO_DE_IVA')).toBe('Saldo tecnico de IVA')
    expect(humanizarCodigo('RECUPERO_IVA_LIBRE_DISPONIB.')).toBe('Recupero IVA libre disponib.')
  })

  it('no toca una etiqueta que ya viene escrita para leer', () => {
    expect(humanizarCodigo('Honorario Mensual')).toBe('Honorario Mensual')
    expect(humanizarCodigo('Ganancias Personas Físicas')).toBe('Ganancias Personas Físicas')
  })

  it('devuelve el original si queda vacío', () => {
    expect(humanizarCodigo('_')).toBe('_')
  })
})

describe('construirPresetsComparativo', () => {
  // 15 de septiembre de 2026 — mes 8 en base cero
  const hoy = new Date(2026, 8, 15)

  it('compara el mes en curso contra el mes anterior completo', () => {
    const preset = construirPresetsComparativo(hoy).find((p) => p.id === 'mes-vs-anterior')!

    expect(preset.a).toEqual({ desde: '2026-09-01', hasta: '2026-09-15' })
    expect(preset.b).toEqual({ desde: '2026-08-01', hasta: '2026-08-31' })
  })

  it('compara contra el mismo mes del año pasado', () => {
    const preset = construirPresetsComparativo(hoy).find((p) => p.id === 'mes-vs-anio-pasado')!

    expect(preset.b).toEqual({ desde: '2025-09-01', hasta: '2025-09-30' })
  })

  it('arma trimestres que no se pisan entre sí', () => {
    const preset = construirPresetsComparativo(hoy).find((p) => p.id === 'trimestre')!

    expect(preset.a.desde).toBe('2026-07-01')
    expect(preset.b).toEqual({ desde: '2026-04-01', hasta: '2026-06-30' })
    // el período B termina justo antes de que arranque el A
    expect(preset.b.hasta < preset.a.desde).toBe(true)
  })

  it('compara el año en curso contra el año pasado completo', () => {
    const preset = construirPresetsComparativo(hoy).find((p) => p.id === 'anio')!

    expect(preset.a).toEqual({ desde: '2026-01-01', hasta: '2026-09-15' })
    expect(preset.b).toEqual({ desde: '2025-01-01', hasta: '2025-12-31' })
  })

  it('cruza fin de año sin romper los meses', () => {
    // 10 de enero de 2026: el mes anterior es diciembre de 2025
    const preset = construirPresetsComparativo(new Date(2026, 0, 10)).find(
      (p) => p.id === 'mes-vs-anterior'
    )!

    expect(preset.b).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' })
  })
})

describe('rangoSinDatosPosibles', () => {
  it('marca los rangos que terminan antes del primer dato cargado', () => {
    expect(rangoSinDatosPosibles({ desde: '2025-08-01', hasta: '2025-09-30' })).toBe(true)
  })

  it('no marca un rango que toca el primer mes con datos', () => {
    expect(rangoSinDatosPosibles({ desde: '2025-10-01', hasta: PRIMER_MES_CON_DATOS })).toBe(false)
  })

  it('no marca un rango actual', () => {
    expect(rangoSinDatosPosibles({ desde: '2026-01-01', hasta: '2026-09-15' })).toBe(false)
  })
})
