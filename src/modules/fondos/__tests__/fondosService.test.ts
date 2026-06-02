import { fondosService } from '../services/fondosService'
import { chequesService } from '../services/chequesService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select:   jest.fn().mockReturnThis(),
    insert:   jest.fn().mockReturnThis(),
    update:   jest.fn().mockReturnThis(),
    delete:   jest.fn().mockReturnThis(),
    eq:       jest.fn().mockReturnThis(),
    gte:      jest.fn().mockReturnThis(),
    lte:      jest.fn().mockReturnThis(),
    order:    jest.fn().mockReturnThis(),
    single:   jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

// ── fondosService.getMovimientos ─────────────────────────────

describe('fondosService.getMovimientos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna lista de movimientos', async () => {
    const movs = [{ id: 'm-1', tipo_movimiento: 'INGRESO', importe_banco: 50000 }]
    mockChain({ order: jest.fn().mockResolvedValue({ data: movs, error: null }) })

    const result = await fondosService.getMovimientos()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('retorna DB_ERROR si falla', async () => {
    mockChain({ order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) })

    const result = await fondosService.getMovimientos()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── fondosService.getSaldo ───────────────────────────────────

describe('fondosService.getSaldo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna saldos como números', async () => {
    const saldo = { saldo_banco: '150000', saldo_efectivo: '25000', saldo_usd: '500' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: saldo, error: null }) })

    const result = await fondosService.getSaldo()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.saldo_banco).toBe(150000)
      expect(result.data.saldo_efectivo).toBe(25000)
      expect(result.data.saldo_usd).toBe(500)
    }
  })

  it('trata nulls como 0', async () => {
    mockChain({ single: jest.fn().mockResolvedValue({ data: { saldo_banco: null, saldo_efectivo: null, saldo_usd: null }, error: null }) })

    const result = await fondosService.getSaldo()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.saldo_banco).toBe(0)
      expect(result.data.saldo_efectivo).toBe(0)
      expect(result.data.saldo_usd).toBe(0)
    }
  })
})

// ── fondosService.registrar ──────────────────────────────────

describe('fondosService.registrar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si todos los importes son 0', async () => {
    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'Test',
      importe_banco: 0,
      importe_efectivo: 0,
      importe_usd: 0,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el concepto es muy corto', async () => {
    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'X',
      importe_banco: 100,
      importe_efectivo: 0,
      importe_usd: 0,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('registra el movimiento correctamente', async () => {
    const mov = { id: 'm-1', tipo_movimiento: 'INGRESO', importe_banco: 50000 }
    mockChain({ single: jest.fn().mockResolvedValue({ data: mov, error: null }) })

    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'Cobro cliente',
      importe_banco: 50000,
      importe_efectivo: 0,
      importe_usd: 0,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.tipo_movimiento).toBe('INGRESO')
  })
})

// ── chequesService.getAll ────────────────────────────────────

describe('chequesService.getAll', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna cheques en cartera', async () => {
    const cheques = [{ id: 'c-1', estado: 'EN_CARTERA', importe: 10000 }]
    // Con opts.estado, la cadena termina en .eq(), no en .order()
    const chain = mockChain()
    chain.eq = jest.fn().mockResolvedValue({ data: cheques, error: null })

    const result = await chequesService.getAll({ estado: 'EN_CARTERA' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })
})

// ── chequesService.actualizarEstado ──────────────────────────

describe('chequesService.actualizarEstado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('actualiza el estado a DEPOSITADO', async () => {
    const cheque = { id: 'c-1', estado: 'DEPOSITADO', fecha_cobro: '2026-04-21' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: cheque, error: null }) })

    const result = await chequesService.actualizarEstado('c-1', 'DEPOSITADO', '2026-04-21')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.estado).toBe('DEPOSITADO')
      expect(result.data.fecha_cobro).toBe('2026-04-21')
    }
  })

  it('retorna DB_ERROR si falla', async () => {
    mockChain({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) })

    const result = await chequesService.actualizarEstado('c-1', 'ANULADO')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
