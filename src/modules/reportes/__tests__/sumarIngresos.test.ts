import { sumarIngresos, calcularVariacionPct } from '../services/sumarIngresos'

describe('sumarIngresos', () => {
  it('suma importe_liquidado y usa importe_facturado cuando existe', () => {
    const resultado = sumarIngresos([
      { importe_liquidado: 1000, importe_facturado: 1210 },
      { importe_liquidado: 500, importe_facturado: null },
    ])

    expect(resultado).toEqual({
      cantidad: 2,
      total_liquidado: 1500,
      total_facturado: 1710,
    })
  })

  it('devuelve ceros con lista vacía', () => {
    expect(sumarIngresos([])).toEqual({ cantidad: 0, total_liquidado: 0, total_facturado: 0 })
  })
})

describe('calcularVariacionPct', () => {
  it('calcula el porcentaje de variación entre dos períodos', () => {
    expect(calcularVariacionPct(100, 150)).toBe(50)
    expect(calcularVariacionPct(200, 100)).toBe(-50)
  })

  it('devuelve null cuando la base es cero (evita división por cero)', () => {
    expect(calcularVariacionPct(0, 100)).toBeNull()
  })
})
