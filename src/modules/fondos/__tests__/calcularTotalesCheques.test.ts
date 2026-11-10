import {
  calcularTotalesCheques,
  esDepositadoSinAcreditar,
  type TChequeParaTotales,
} from '../services/calcularTotalesCheques'

function cheque(over: Partial<TChequeParaTotales>): TChequeParaTotales {
  return {
    tipo: 'TERCERO',
    estado: 'EN_CARTERA',
    importe: 0,
    acreditacion_confirmada: false,
    ...over,
  }
}

describe('calcularTotalesCheques', () => {
  it('lista vacía da todo en cero', () => {
    expect(calcularTotalesCheques([])).toEqual({
      enCartera: 0,
      depositadosSinAcreditar: 0,
      totalCartera: 0,
      emitidosSinDebitar: 0,
    })
  })

  it('un cheque propio nunca suma en la cartera', () => {
    const t = calcularTotalesCheques([
      cheque({ importe: 1000 }),
      cheque({ tipo: 'PROPIO', importe: 929000 }),
    ])
    expect(t.totalCartera).toBe(1000)
    expect(t.emitidosSinDebitar).toBe(929000)
  })

  it('un propio ya debitado deja de estar pendiente', () => {
    const t = calcularTotalesCheques([
      cheque({ tipo: 'PROPIO', importe: 929000, acreditacion_confirmada: true }),
    ])
    expect(t.emitidosSinDebitar).toBe(0)
  })

  it('un depositado sin acreditar sigue sumando en la cartera; acreditado ya no', () => {
    const t = calcularTotalesCheques([
      cheque({ importe: 7218795.25 }),
      cheque({ estado: 'DEPOSITADO', importe: 1230000 }),
      cheque({ estado: 'DEPOSITADO', importe: 229725.5 }),
      cheque({ estado: 'DEPOSITADO', importe: 158012.52 }),
      cheque({ estado: 'DEPOSITADO', importe: 815000, acreditacion_confirmada: true }),
    ])
    expect(t.enCartera).toBe(7218795.25)
    expect(t.depositadosSinAcreditar).toBe(1617738.02)
    expect(t.totalCartera).toBe(8836533.27)
  })

  it('ignora endosados, rechazados y anulados', () => {
    const t = calcularTotalesCheques([
      cheque({ estado: 'ENDOSADO', importe: 1 }),
      cheque({ estado: 'RECHAZADO', importe: 1 }),
      cheque({ estado: 'ANULADO', importe: 1 }),
      cheque({ tipo: 'PROPIO', estado: 'ANULADO', importe: 1 }),
    ])
    expect(t.totalCartera).toBe(0)
    expect(t.emitidosSinDebitar).toBe(0)
  })

  it('redondea a centavos aunque los importes vengan como texto de la DB', () => {
    const t = calcularTotalesCheques([
      cheque({ importe: '0.1' as unknown as number }),
      cheque({ importe: '0.2' as unknown as number }),
    ])
    expect(t.totalCartera).toBe(0.3)
  })
})

describe('esDepositadoSinAcreditar', () => {
  it('solo terceros depositados sin tilde', () => {
    expect(esDepositadoSinAcreditar(cheque({ estado: 'DEPOSITADO' }))).toBe(true)
    expect(
      esDepositadoSinAcreditar(cheque({ estado: 'DEPOSITADO', acreditacion_confirmada: true }))
    ).toBe(false)
    expect(esDepositadoSinAcreditar(cheque({ tipo: 'PROPIO', estado: 'DEPOSITADO' }))).toBe(false)
    expect(esDepositadoSinAcreditar(cheque({}))).toBe(false)
  })
})
