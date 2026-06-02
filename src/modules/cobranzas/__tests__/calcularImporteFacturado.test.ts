import {
  calcularImporteFacturado,
  serieReciboDeTipoComprobante,
} from '../services/calcularImporteFacturado'

describe('calcularImporteFacturado', () => {
  it('suma 21% de IVA para Factura A', () => {
    expect(calcularImporteFacturado(100000, 'FC_A')).toBe(121000)
    expect(calcularImporteFacturado(82307.24, 'FC_A')).toBe(99591.76)
  })

  it('no suma IVA para Factura C', () => {
    expect(calcularImporteFacturado(100000, 'FC_C')).toBe(100000)
  })

  it('no suma IVA para Presupuesto', () => {
    expect(calcularImporteFacturado(50000, 'PRESUPUESTO')).toBe(50000)
  })

  it('no suma IVA si no hay tipo de comprobante', () => {
    expect(calcularImporteFacturado(50000, null)).toBe(50000)
    expect(calcularImporteFacturado(50000, undefined)).toBe(50000)
    expect(calcularImporteFacturado(50000, '')).toBe(50000)
  })

  it('redondea a 2 decimales', () => {
    expect(calcularImporteFacturado(33333.33, 'FC_A')).toBe(40333.33)
  })

  it('devuelve 0 para inputs inválidos', () => {
    expect(calcularImporteFacturado(0, 'FC_A')).toBe(0)
    expect(calcularImporteFacturado(-100, 'FC_A')).toBe(0)
    expect(calcularImporteFacturado(NaN, 'FC_A')).toBe(0)
  })
})

describe('serieReciboDeTipoComprobante', () => {
  it('Factura A → serie A', () => {
    expect(serieReciboDeTipoComprobante('FC_A')).toBe('A')
  })

  it('Factura C → serie C', () => {
    expect(serieReciboDeTipoComprobante('FC_C')).toBe('C')
  })

  it('Presupuesto → serie C', () => {
    expect(serieReciboDeTipoComprobante('PRESUPUESTO')).toBe('C')
  })

  it('sin tipo → serie C por defecto', () => {
    expect(serieReciboDeTipoComprobante(null)).toBe('C')
    expect(serieReciboDeTipoComprobante(undefined)).toBe('C')
  })
})
