import { gastosRecurrentesService } from '../services/gastosRecurrentesService'
import { avanzarFechaVencimiento, calcularProximaFechaVencimiento } from '../utils/fechas'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('fechas de gastos recurrentes', () => {
  it('calcula el próximo día disponible del mes actual', () => {
    const result = calcularProximaFechaVencimiento(25, new Date(2026, 4, 18))
    expect(result).toBe('2026-05-25')
  })

  it('pasa al mes siguiente si el día ya pasó', () => {
    const result = calcularProximaFechaVencimiento(10, new Date(2026, 4, 18))
    expect(result).toBe('2026-06-10')
  })

  it('ajusta día 31 al último día de febrero', () => {
    const result = avanzarFechaVencimiento('2026-01-31', 31)
    expect(result).toBe('2026-02-28')
  })

  it('respeta febrero bisiesto', () => {
    const result = avanzarFechaVencimiento('2028-01-31', 31)
    expect(result).toBe('2028-02-29')
  })
})

describe('gastosRecurrentesService.getProximos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna próximos vencimientos', async () => {
    const rows = [{ gasto_id: UUID, descripcion: 'Luz', proxima_fecha_vencimiento: '2026-05-25' }]
    mockChain({ order: jest.fn().mockResolvedValue({ data: rows, error: null }) })

    const result = await gastosRecurrentesService.getProximos()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('aplica límite de días cuando se informa', async () => {
    const chain = mockChain()
    chain.lte = jest.fn().mockResolvedValue({ data: [], error: null })

    const result = await gastosRecurrentesService.getProximos(30)
    expect(result.ok).toBe(true)
    expect(chain.lte).toHaveBeenCalledWith('proxima_fecha_vencimiento', expect.any(String))
  })
})

describe('gastosRecurrentesService.create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('valida día de vencimiento', async () => {
    const result = await gastosRecurrentesService.create({
      categoria_id: UUID,
      descripcion: 'Luz',
      dia_vencimiento: 32,
      activo: true,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea gasto recurrente con próxima fecha calculada', async () => {
    const row = {
      id: 'g-1',
      categoria_id: UUID,
      descripcion: 'Luz',
      dia_vencimiento: 25,
      proxima_fecha_vencimiento: '2026-05-25',
      activo: true,
    }
    const chain = mockChain({ single: jest.fn().mockResolvedValue({ data: row, error: null }) })

    const result = await gastosRecurrentesService.create({
      categoria_id: UUID,
      descripcion: 'Luz',
      dia_vencimiento: 25,
      activo: true,
    })

    expect(result.ok).toBe(true)
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      descripcion: 'Luz',
      proxima_fecha_vencimiento: expect.any(String),
    }))
  })
})
