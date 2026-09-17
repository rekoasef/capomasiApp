import { ajusteSaldoFondosSchema, chequeManualSchema } from '../schemas/fondoSchema'

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('chequeManualSchema', () => {
  it('acepta un cheque de tercero con cliente', () => {
    const result = chequeManualSchema.safeParse({
      tipo: 'TERCERO',
      numero: '123',
      banco: 'Nación',
      importe: 10000,
      fecha_emision: '2026-04-21',
      cliente_id: UUID,
    })
    expect(result.success).toBe(true)
  })

  it('acepta un cheque propio con proveedor', () => {
    const result = chequeManualSchema.safeParse({
      tipo: 'PROPIO',
      numero: '456',
      banco: 'Galicia',
      importe: 5000,
      fecha_emision: '2026-04-21',
      proveedor_id: UUID,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza un cheque de tercero sin cliente', () => {
    const result = chequeManualSchema.safeParse({
      tipo: 'TERCERO',
      numero: '123',
      banco: 'Nación',
      importe: 10000,
      fecha_emision: '2026-04-21',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza un cheque propio sin proveedor', () => {
    const result = chequeManualSchema.safeParse({
      tipo: 'PROPIO',
      numero: '456',
      banco: 'Galicia',
      importe: 5000,
      fecha_emision: '2026-04-21',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza importe negativo o cero', () => {
    const base = {
      tipo: 'TERCERO' as const,
      numero: '123',
      banco: 'Nación',
      fecha_emision: '2026-04-21',
      cliente_id: UUID,
    }
    expect(chequeManualSchema.safeParse({ ...base, importe: 0 }).success).toBe(false)
    expect(chequeManualSchema.safeParse({ ...base, importe: -100 }).success).toBe(false)
  })

  it('rechaza número o banco vacíos', () => {
    const base = {
      tipo: 'TERCERO' as const,
      importe: 10000,
      fecha_emision: '2026-04-21',
      cliente_id: UUID,
    }
    expect(chequeManualSchema.safeParse({ ...base, numero: '', banco: 'Nación' }).success).toBe(
      false
    )
    expect(chequeManualSchema.safeParse({ ...base, numero: '123', banco: '' }).success).toBe(false)
  })
})

// Ajustar el balance de una cuenta a mano (pedido de Paola, 2026-09-17).
describe('ajusteSaldoFondosSchema', () => {
  const base = {
    cuenta: 'usd' as const,
    fecha: '2026-09-17',
    notas: 'no cargué el saldo inicial, hoy tengo US$ 800',
  }

  it('acepta un ajuste con nota', () => {
    expect(ajusteSaldoFondosSchema.safeParse({ ...base, saldo_real: 800 }).success).toBe(true)
  })

  it('acepta saldo negativo y cero — el banco puede estar en descubierto', () => {
    expect(ajusteSaldoFondosSchema.safeParse({ ...base, saldo_real: -4946410.5 }).success).toBe(
      true
    )
    expect(ajusteSaldoFondosSchema.safeParse({ ...base, saldo_real: 0 }).success).toBe(true)
  })

  it('exige una nota que explique el ajuste', () => {
    expect(ajusteSaldoFondosSchema.safeParse({ ...base, saldo_real: 800, notas: '' }).success).toBe(
      false
    )
    expect(
      ajusteSaldoFondosSchema.safeParse({ ...base, saldo_real: 800, notas: '   ' }).success
    ).toBe(false)
  })

  it('rechaza un saldo vacío o no numérico', () => {
    expect(ajusteSaldoFondosSchema.safeParse({ ...base, saldo_real: NaN }).success).toBe(false)
    expect(ajusteSaldoFondosSchema.safeParse({ ...base }).success).toBe(false)
  })

  it('rechaza cheques en cartera: ese saldo lo manda el lifecycle de cada cheque', () => {
    expect(
      ajusteSaldoFondosSchema.safeParse({
        ...base,
        cuenta: 'cheques_cartera',
        saldo_real: 800,
      }).success
    ).toBe(false)
  })
})
