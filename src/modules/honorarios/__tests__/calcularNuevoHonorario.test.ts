import {
  calcularNuevoHonorario,
  mesesDesdeAjuste,
  estaVencidoAjuste,
} from '../services/calcularNuevoHonorario'

describe('calcularNuevoHonorario', () => {
  it('aplica el porcentaje correctamente', () => {
    expect(calcularNuevoHonorario(100000, 5)).toBe(105000)
  })

  it('maneja porcentaje decimal', () => {
    expect(calcularNuevoHonorario(82307.24, 5.968)).toBe(87219.34)
  })

  it('redondea a 2 decimales', () => {
    expect(calcularNuevoHonorario(100000, 3.33)).toBe(103330)
  })

  it('maneja porcentaje cero', () => {
    expect(calcularNuevoHonorario(50000, 0)).toBe(50000)
  })

  it('rechaza montos negativos', () => {
    expect(() => calcularNuevoHonorario(-100, 5)).toThrow()
  })

  it('funciona con montos chicos', () => {
    expect(calcularNuevoHonorario(1000, 10)).toBe(1100)
  })

  it('maneja porcentaje alto (100%)', () => {
    expect(calcularNuevoHonorario(50000, 100)).toBe(100000)
  })
})

describe('estaVencidoAjuste', () => {
  it('detecta ajuste vencido cuando meses >= frecuencia', () => {
    expect(estaVencidoAjuste(2, 2)).toBe(true)
    expect(estaVencidoAjuste(3, 2)).toBe(true)
  })

  it('no marca como vencido cuando meses < frecuencia', () => {
    expect(estaVencidoAjuste(1, 2)).toBe(false)
    expect(estaVencidoAjuste(0, 2)).toBe(false)
  })
})

describe('mesesDesdeAjuste', () => {
  it('retorna 0 para una fecha de hoy', () => {
    const hoy = new Date().toISOString().split('T')[0]
    expect(mesesDesdeAjuste(hoy)).toBe(0)
  })

  it('calcula meses correctamente', () => {
    const hace6Meses = new Date()
    hace6Meses.setMonth(hace6Meses.getMonth() - 6)
    const fecha = hace6Meses.toISOString().split('T')[0]
    expect(mesesDesdeAjuste(fecha)).toBe(6)
  })
})
