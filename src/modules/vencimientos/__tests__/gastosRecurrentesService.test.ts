import { gastosRecurrentesService } from '../services/gastosRecurrentesService'

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

  it('crea el gasto sin mandar la próxima fecha — la pone la DB', async () => {
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
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ descripcion: 'Luz' }))
    expect(chain.insert.mock.calls[0][0]).not.toHaveProperty('proxima_fecha_vencimiento')
  })
})

// Regresión del reporte de Paola (2026-09-10): "el cable y las expensas las marqué
// como pagadas y me vuelven a aparecer". Editar el gasto mandaba una
// proxima_fecha_vencimiento recalculada desde hoy, que caía en el período ya pagado.
describe('gastosRecurrentesService.update', () => {
  beforeEach(() => jest.clearAllMocks())

  it('no manda proxima_fecha_vencimiento aunque el form traiga dia_vencimiento', async () => {
    const chain = mockChain({
      single: jest.fn().mockResolvedValue({ data: { id: 'g-1' }, error: null }),
    })

    const result = await gastosRecurrentesService.update('g-1', {
      categoria_id: UUID,
      descripcion: 'CABLE IMAGEN ARMST.',
      dia_vencimiento: 10,
      activo: true,
    })

    expect(result.ok).toBe(true)
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty('proxima_fecha_vencimiento')
  })

  it('toggleActivo solo toca activo', async () => {
    const chain = mockChain({
      single: jest.fn().mockResolvedValue({ data: { id: 'g-1' }, error: null }),
    })

    await gastosRecurrentesService.toggleActivo('g-1', false)

    expect(chain.update).toHaveBeenCalledWith({ activo: false })
  })
})
