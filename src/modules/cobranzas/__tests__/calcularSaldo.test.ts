import {
  calcularSaldoPendiente,
  calcularTotalImputado,
  calcularSaldoLibreRecibo,
  calcularImportePagoUSD,
  diasDesdeEmision,
  categorizarEdadDeuda,
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
      { importe: 5000.50 },
      { importe: 3000.25 },
      { importe: 2000.10 },
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
