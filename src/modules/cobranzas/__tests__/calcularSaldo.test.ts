import {
  calcularSaldoPendiente,
  calcularTotalImputado,
  calcularSaldoLibreRecibo,
  calcularImportePagoUSD,
  diasDesdeEmision,
  categorizarEdadDeuda,
  calcularTotalesCuentaCorriente,
} from '../services/calcularSaldo'

describe('calcularSaldoPendiente', () => {
  it('devuelve el importe completo sin imputaciones', () => {
    expect(calcularSaldoPendiente(10000, [])).toBe(10000)
  })

  it('descuenta imputaciones parciales', () => {
    expect(calcularSaldoPendiente(10000, [{ importe: 3000 }, { importe: 2000 }])).toBe(5000)
  })

  it('devuelve 0 cuando está totalmente imputado', () => {
    expect(calcularSaldoPendiente(5000, [{ importe: 5000 }])).toBe(0)
  })

  it('nunca devuelve negativo', () => {
    expect(calcularSaldoPendiente(5000, [{ importe: 6000 }])).toBe(0)
  })

  it('redondea a 2 decimales', () => {
    expect(calcularSaldoPendiente(100.005, [{ importe: 50.002 }])).toBe(50.0)
  })

  it('maneja múltiples imputaciones parciales con decimales', () => {
    const saldo = calcularSaldoPendiente(15000, [
      { importe: 5000.5 },
      { importe: 3000.25 },
      { importe: 2000.1 },
    ])
    expect(saldo).toBe(4999.15)
  })
})

describe('calcularTotalImputado', () => {
  it('suma imputaciones correctamente', () => {
    expect(calcularTotalImputado([{ importe: 1000 }, { importe: 2000 }])).toBe(3000)
  })

  it('devuelve 0 sin imputaciones', () => {
    expect(calcularTotalImputado([])).toBe(0)
  })
})

describe('calcularSaldoLibreRecibo', () => {
  it('devuelve el importe completo del recibo si no hay imputaciones', () => {
    expect(calcularSaldoLibreRecibo(10000, [])).toBe(10000)
  })

  it('descuenta imputaciones del saldo libre', () => {
    expect(calcularSaldoLibreRecibo(10000, [{ importe: 3000 }])).toBe(7000)
  })

  it('devuelve 0 cuando todo el recibo fue imputado', () => {
    expect(calcularSaldoLibreRecibo(5000, [{ importe: 2000 }, { importe: 3000 }])).toBe(0)
  })

  it('nunca devuelve negativo', () => {
    expect(calcularSaldoLibreRecibo(5000, [{ importe: 6000 }])).toBe(0)
  })
})

describe('calcularImportePagoUSD', () => {
  it('convierte USD a ARS correctamente', () => {
    expect(calcularImportePagoUSD(100, 1000)).toBe(100000)
  })

  it('redondea a 2 decimales', () => {
    expect(calcularImportePagoUSD(100.333, 1000)).toBe(100333)
  })

  it('funciona con tipo de cambio decimal', () => {
    expect(calcularImportePagoUSD(50, 1234.56)).toBe(61728)
  })
})

describe('categorizarEdadDeuda', () => {
  it('categoriza 0-30 días', () => {
    expect(categorizarEdadDeuda(0)).toBe('0-30')
    expect(categorizarEdadDeuda(30)).toBe('0-30')
  })

  it('categoriza 31-60 días', () => {
    expect(categorizarEdadDeuda(31)).toBe('31-60')
    expect(categorizarEdadDeuda(60)).toBe('31-60')
  })

  it('categoriza 61-90 días', () => {
    expect(categorizarEdadDeuda(61)).toBe('61-90')
    expect(categorizarEdadDeuda(90)).toBe('61-90')
  })

  it('categoriza +90 días', () => {
    expect(categorizarEdadDeuda(91)).toBe('90+')
    expect(categorizarEdadDeuda(365)).toBe('90+')
  })
})

describe('diasDesdeEmision', () => {
  it('devuelve aprox 0 para hoy', () => {
    const hoy = new Date().toISOString().split('T')[0]
    expect(diasDesdeEmision(hoy)).toBeGreaterThanOrEqual(0)
    expect(diasDesdeEmision(hoy)).toBeLessThanOrEqual(1)
  })

  it('calcula días correctamente', () => {
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    const fecha = hace30.toISOString().split('T')[0]
    const dias = diasDesdeEmision(fecha)
    expect(dias).toBeGreaterThanOrEqual(29)
    expect(dias).toBeLessThanOrEqual(31)
  })
})

describe('calcularTotalesCuentaCorriente', () => {
  it('suma devengado, cobrado, saldo y pendientes de todos los clientes', () => {
    const totales = calcularTotalesCuentaCorriente([
      {
        total_devengado: 3780301.5,
        total_cobrado: 2464900.75,
        saldo_pendiente: 1315400.75,
        liquidaciones_pendientes: 3,
      },
      {
        total_devengado: 2474327.46,
        total_cobrado: 1237163.73,
        saldo_pendiente: 1237163.73,
        liquidaciones_pendientes: 2,
      },
    ])
    expect(totales).toEqual({
      total_devengado: 6254628.96,
      total_cobrado: 3702064.48,
      saldo_pendiente: 2552564.48,
      liquidaciones_pendientes: 5,
    })
  })

  it('redondea a 2 decimales', () => {
    const totales = calcularTotalesCuentaCorriente([
      {
        total_devengado: 0.1,
        total_cobrado: 0.1,
        saldo_pendiente: 0.1,
        liquidaciones_pendientes: 1,
      },
      {
        total_devengado: 0.2,
        total_cobrado: 0.2,
        saldo_pendiente: 0.2,
        liquidaciones_pendientes: 1,
      },
    ])
    expect(totales.saldo_pendiente).toBe(0.3)
  })

  it('devuelve ceros sin filas', () => {
    expect(calcularTotalesCuentaCorriente([])).toEqual({
      total_devengado: 0,
      total_cobrado: 0,
      saldo_pendiente: 0,
      liquidaciones_pendientes: 0,
    })
  })
})
