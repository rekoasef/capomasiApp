import { trabajosService } from '../services/trabajosService'
import { ESTADO_SIGUIENTE } from '../types'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select:     jest.fn().mockReturnThis(),
    insert:     jest.fn().mockReturnThis(),
    update:     jest.fn().mockReturnThis(),
    delete:     jest.fn().mockReturnThis(),
    eq:         jest.fn().mockReturnThis(),
    in:         jest.fn().mockReturnThis(),
    order:      jest.fn().mockReturnThis(),
    single:     jest.fn().mockReturnThis(),
    maybeSingle:jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

// UUID v4 válido para tests
const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('ESTADO_SIGUIENTE — transiciones de estado', () => {
  it('PENDIENTE → EN_PROCESO', () => expect(ESTADO_SIGUIENTE['PENDIENTE']).toBe('EN_PROCESO'))
  it('EN_PROCESO → FINALIZADO', () => expect(ESTADO_SIGUIENTE['EN_PROCESO']).toBe('FINALIZADO'))
  it('FINALIZADO → COBRADO', () => expect(ESTADO_SIGUIENTE['FINALIZADO']).toBe('COBRADO'))
  it('COBRADO → null (estado final)', () => expect(ESTADO_SIGUIENTE['COBRADO']).toBeNull())
})

describe('trabajosService.create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si falta tipo_trabajo', async () => {
    const result = await trabajosService.create({ cliente_id: UUID, anio: 2026 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el año es inválido', async () => {
    const result = await trabajosService.create({ cliente_id: UUID, tipo_trabajo: 'BALANCE', anio: 2019 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea el trabajo correctamente', async () => {
    const trabajo = { id: 't-1', cliente_id: UUID, tipo_trabajo: 'BALANCE', anio: 2026, estado: 'PENDIENTE' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: trabajo, error: null }) })

    const result = await trabajosService.create({
      cliente_id: UUID,
      tipo_trabajo: 'BALANCE',
      anio: 2026,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('PENDIENTE')
  })

  it('retorna CONFLICT si ya existe el trabajo para ese cliente/año/tipo', async () => {
    mockChain({ single: jest.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } }) })

    const result = await trabajosService.create({
      cliente_id: UUID,
      tipo_trabajo: 'BALANCE',
      anio: 2026,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CONFLICT')
  })
})

describe('trabajosService.avanzarEstado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('avanza de PENDIENTE a EN_PROCESO', async () => {
    const chain = mockChain()
    chain.single
      .mockResolvedValueOnce({ data: { estado: 'PENDIENTE', honorario: null }, error: null })
      .mockResolvedValueOnce({ data: { id: 't-1', estado: 'EN_PROCESO' }, error: null })

    const result = await trabajosService.avanzarEstado('t-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('EN_PROCESO')
  })

  it('requiere honorario para pasar a COBRADO', async () => {
    const chain = mockChain()
    chain.single.mockResolvedValue({ data: { estado: 'FINALIZADO', honorario: null }, error: null })

    const result = await trabajosService.avanzarEstado('t-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('permite cobrar si ya tiene honorario cargado', async () => {
    const chain = mockChain()
    chain.single
      .mockResolvedValueOnce({ data: { estado: 'FINALIZADO', honorario: 50000 }, error: null })
      .mockResolvedValueOnce({ data: { id: 't-1', estado: 'COBRADO' }, error: null })

    const result = await trabajosService.avanzarEstado('t-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('COBRADO')
  })

  it('rechaza avanzar desde COBRADO (estado final)', async () => {
    const chain = mockChain()
    chain.single.mockResolvedValue({ data: { estado: 'COBRADO', honorario: 50000 }, error: null })

    const result = await trabajosService.avanzarEstado('t-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })
})

describe('trabajosService.retrocederEstado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retrocede de EN_PROCESO a PENDIENTE', async () => {
    const chain = mockChain()
    chain.single
      .mockResolvedValueOnce({ data: { estado: 'EN_PROCESO' }, error: null })
      .mockResolvedValueOnce({ data: { id: 't-1', estado: 'PENDIENTE' }, error: null })

    const result = await trabajosService.retrocederEstado('t-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('PENDIENTE')
  })

  it('rechaza retroceder desde PENDIENTE', async () => {
    const chain = mockChain()
    chain.single.mockResolvedValue({ data: { estado: 'PENDIENTE' }, error: null })

    const result = await trabajosService.retrocederEstado('t-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })
})

describe('trabajosService.getByCliente', () => {
  beforeEach(() => jest.clearAllMocks())

  function mockDoubleOrder(resolved: { data: unknown; error: unknown }) {
    const secondOrder = jest.fn().mockResolvedValue(resolved)
    const firstOrder = jest.fn().mockReturnValue({ order: secondOrder })
    const chain = {
      select:      jest.fn().mockReturnThis(),
      insert:      jest.fn().mockReturnThis(),
      update:      jest.fn().mockReturnThis(),
      delete:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      in:          jest.fn().mockReturnThis(),
      single:      jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      order:       firstOrder,
    }
    mockFrom.mockReturnValue(chain)
  }

  it('retorna lista de trabajos', async () => {
    const trabajos = [{ id: 't-1', tipo_trabajo: 'BALANCE', anio: 2026, estado: 'PENDIENTE' }]
    mockDoubleOrder({ data: trabajos, error: null })
    const result = await trabajosService.getByCliente(UUID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(Array.isArray(result.data)).toBe(true)
  })

  it('retorna DB_ERROR si falla', async () => {
    mockDoubleOrder({ data: null, error: { message: 'DB error' } })
    const result = await trabajosService.getByCliente(UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
