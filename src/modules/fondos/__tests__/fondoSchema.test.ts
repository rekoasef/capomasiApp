import { chequeManualSchema } from '../schemas/fondoSchema'

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
