import { liquidacionesService } from '../services/liquidacionesService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock

function mockChain(terminal: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    neq:    jest.fn().mockReturnThis(),
    in:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    ...terminal,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('liquidacionesService.getByCliente', () => {
  beforeEach(() => jest.clearAllMocks())

  it('devuelve lista de liquidaciones', async () => {
    const liquidaciones = [
      { id: 'l-1', cliente_id: 'c-1', importe_liquidado: 10000, estado: 'PENDIENTE', pagos: [] },
    ]
    mockChain({ order: jest.fn().mockResolvedValue({ data: liquidaciones, error: null }) })

    const result = await liquidacionesService.getByCliente('c-1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].importe_liquidado).toBe(10000)
    }
  })

  it('devuelve error si la DB falla', async () => {
    mockChain({ order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) })

    const result = await liquidacionesService.getByCliente('c-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

describe('liquidacionesService.create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna error de validación para importe inválido', async () => {
    const result = await liquidacionesService.create({
      cliente_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      tipo_servicio: 'HONORARIO_MENSUAL',
      fecha_liquidacion: '2026-04-01',
      importe_liquidado: -100,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna error de validación si falta tipo_servicio', async () => {
    const result = await liquidacionesService.create({
      cliente_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      fecha_liquidacion: '2026-04-01',
      importe_liquidado: 10000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea liquidación correctamente con datos válidos', async () => {
    const liquidacion = { id: 'l-new', cliente_id: 'c-1', importe_liquidado: 15000, estado: 'PENDIENTE' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: liquidacion, error: null }) })

    const result = await liquidacionesService.create({
      cliente_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      tipo_servicio: 'HONORARIO_MENSUAL',
      fecha_liquidacion: '2026-04-01',
      importe_liquidado: 15000,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.importe_liquidado).toBe(15000)
  })

  it('soporta tipo_liquidacion SALDO_INICIAL', async () => {
    const liquidacion = { id: 'l-si', tipo_liquidacion: 'SALDO_INICIAL', importe_liquidado: 50000 }
    mockChain({ single: jest.fn().mockResolvedValue({ data: liquidacion, error: null }) })

    const result = await liquidacionesService.create({
      cliente_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      tipo_servicio: 'HONORARIO_MENSUAL',
      fecha_liquidacion: '2026-01-01',
      importe_liquidado: 50000,
      tipo_liquidacion: 'SALDO_INICIAL',
    })
    expect(result.ok).toBe(true)
  })
})

describe('liquidacionesService.getUltimaByCliente', () => {
  beforeEach(() => jest.clearAllMocks())

  it('devuelve la última liquidación (no anulada) del cliente', async () => {
    const liq = {
      id: 'l-last',
      cliente_id: 'c-1',
      tipo_servicio: 'HONORARIO_MENSUAL',
      importe_liquidado: 12000,
      periodo_mes: 'Mayo',
      periodo_anio: 2026,
    }
    mockChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: liq, error: null }),
    })

    const result = await liquidacionesService.getUltimaByCliente('c-1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data?.id).toBe('l-last')
      expect(result.data?.periodo_mes).toBe('Mayo')
    }
  })

  it('devuelve null si no hay liquidaciones', async () => {
    mockChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await liquidacionesService.getUltimaByCliente('c-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('filtra por tipo_servicio cuando se provee', async () => {
    const chain = mockChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    await liquidacionesService.getUltimaByCliente('c-1', 'BALANCE')
    expect(chain.eq).toHaveBeenCalledWith('tipo_servicio', 'BALANCE')
  })

  it('devuelve DB_ERROR si la query falla', async () => {
    mockChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })
    const result = await liquidacionesService.getUltimaByCliente('c-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

describe('liquidacionesService.anular', () => {
  beforeEach(() => jest.clearAllMocks())

  it('anula la liquidación correctamente', async () => {
    const anulada = { id: 'l-1', estado: 'ANULADA' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: anulada, error: null }) })

    const result = await liquidacionesService.anular('l-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('ANULADA')
  })

  it('devuelve DB_ERROR si falla', async () => {
    mockChain({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Forbidden' } }) })

    const result = await liquidacionesService.anular('l-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
