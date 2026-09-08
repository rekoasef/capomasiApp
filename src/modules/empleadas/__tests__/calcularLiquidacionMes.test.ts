import {
  calcularImporteHoras,
  calcularLiquidacionMes,
  type TItemLiquidacion,
  type TItemPago,
} from '../services/calcularLiquidacionMes'

const haber = (anio: number, mes: number, importe: number | string): TItemLiquidacion => ({
  periodo_anio: anio,
  periodo_mes: mes,
  tipo_concepto: 'HABER',
  importe,
})

const descuento = (anio: number, mes: number, importe: number | string): TItemLiquidacion => ({
  periodo_anio: anio,
  periodo_mes: mes,
  tipo_concepto: 'DESCUENTO',
  importe,
})

const pago = (anio: number, mes: number, importe: number | string): TItemPago => ({
  periodo_anio: anio,
  periodo_mes: mes,
  importe,
})

describe('calcularLiquidacionMes', () => {
  it('suma haberes y descuentos solo del mes pedido', () => {
    const r = calcularLiquidacionMes(
      [haber(2026, 9, 100000), descuento(2026, 9, 10000), haber(2026, 10, 999999)],
      [],
      2026,
      9
    )
    expect(r.totalHaberes).toBe(100000)
    expect(r.totalDescuentos).toBe(10000)
    expect(r.neto).toBe(90000)
  })

  it('sin historial previo el saldo anterior es 0', () => {
    const r = calcularLiquidacionMes([haber(2026, 9, 100000)], [pago(2026, 9, 100000)], 2026, 9)
    expect(r.saldoAnterior).toBe(0)
    expect(r.pendiente).toBe(0)
  })

  // El caso real de Paola: le pagó 390.000 sobre un neto de 383.042.
  it('deja pendiente negativo cuando se pagó de más', () => {
    const r = calcularLiquidacionMes([haber(2026, 9, 383042)], [pago(2026, 9, 390000)], 2026, 9)
    expect(r.neto).toBe(383042)
    expect(r.totalPagado).toBe(390000)
    expect(r.pendiente).toBe(-6958)
  })

  // ...y esos 6.958 se descuentan solos en octubre, que era la pregunta.
  it('arrastra al mes siguiente lo que se pagó de más', () => {
    const items = [haber(2026, 9, 383042), haber(2026, 10, 400000)]
    const pagos = [pago(2026, 9, 390000)]

    const octubre = calcularLiquidacionMes(items, pagos, 2026, 10)
    expect(octubre.neto).toBe(400000)
    expect(octubre.saldoAnterior).toBe(-6958)
    expect(octubre.pendiente).toBe(393042)
  })

  it('arrastra también lo que quedó debiendo', () => {
    const items = [haber(2026, 9, 100000), haber(2026, 10, 100000)]
    const pagos = [pago(2026, 9, 60000)]

    const octubre = calcularLiquidacionMes(items, pagos, 2026, 10)
    expect(octubre.saldoAnterior).toBe(40000)
    expect(octubre.pendiente).toBe(140000)
  })

  it('cruza el cambio de año', () => {
    const items = [haber(2025, 12, 50000), haber(2026, 1, 80000)]
    const pagos = [pago(2025, 12, 30000)]

    const enero = calcularLiquidacionMes(items, pagos, 2026, 1)
    expect(enero.saldoAnterior).toBe(20000)
    expect(enero.pendiente).toBe(100000)
  })

  it('acumula varios meses de arrastre', () => {
    const items = [haber(2026, 7, 100000), haber(2026, 8, 100000), haber(2026, 9, 100000)]
    const pagos = [pago(2026, 7, 90000), pago(2026, 8, 80000)]

    const septiembre = calcularLiquidacionMes(items, pagos, 2026, 9)
    expect(septiembre.saldoAnterior).toBe(30000)
    expect(septiembre.pendiente).toBe(130000)
  })

  it('los descuentos de meses anteriores entran en el arrastre', () => {
    const items = [haber(2026, 8, 100000), descuento(2026, 8, 20000), haber(2026, 9, 50000)]
    const pagos = [pago(2026, 8, 80000)]

    const septiembre = calcularLiquidacionMes(items, pagos, 2026, 9)
    expect(septiembre.saldoAnterior).toBe(0)
    expect(septiembre.pendiente).toBe(50000)
  })

  it('acepta importes que vienen como string desde Supabase', () => {
    const r = calcularLiquidacionMes(
      [haber(2026, 9, '383042.00')],
      [pago(2026, 9, '390000.00')],
      2026,
      9
    )
    expect(r.pendiente).toBe(-6958)
  })

  it('sin datos devuelve todo en cero', () => {
    const r = calcularLiquidacionMes([], [], 2026, 9)
    expect(r).toEqual({
      totalHaberes: 0,
      totalDescuentos: 0,
      neto: 0,
      totalPagado: 0,
      saldoAnterior: 0,
      pendiente: 0,
    })
  })
})

describe('calcularImporteHoras', () => {
  it('multiplica horas por valor hora', () => {
    expect(calcularImporteHoras(46, 8327)).toBe(383042)
  })

  it('redondea a 2 decimales', () => {
    expect(calcularImporteHoras(7.5, 8327.33)).toBe(62454.98)
  })

  it('soporta medias horas', () => {
    expect(calcularImporteHoras(46.5, 8327)).toBe(387205.5)
  })

  it('devuelve 0 con valores vacíos o inválidos', () => {
    expect(calcularImporteHoras(0, 8327)).toBe(0)
    expect(calcularImporteHoras(46, 0)).toBe(0)
    expect(calcularImporteHoras(-1, 8327)).toBe(0)
    expect(calcularImporteHoras(NaN, 8327)).toBe(0)
  })
})
