import { clientesService } from '../services/clientesService'

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
    eq:     jest.fn().mockReturnThis(),
    is:     jest.fn().mockReturnThis(),
    or:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('clientesService.getAll', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna lista de clientes', async () => {
    const clientes = [{ id: '1', nombre: 'García Juan', cuit: '20123456789' }]
    mockChain({ order: jest.fn().mockResolvedValue({ data: clientes, error: null }) })

    const result = await clientesService.getAll()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('retorna DB_ERROR si Supabase falla', async () => {
    mockChain({ order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }) })

    const result = await clientesService.getAll()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

describe('clientesService.create — validaciones CUIT', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rechaza CUIT con menos de 11 dígitos', async () => {
    const result = await clientesService.create({ nombre: 'Test', cuit: '2012345678' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza CUIT con letras', async () => {
    const result = await clientesService.create({ nombre: 'Test', cuit: '2012345678X' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza CUIT con dígito verificador inválido', async () => {
    const result = await clientesService.create({ nombre: 'Test', cuit: '20123456780' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('acepta CUIT válido y llama a Supabase', async () => {
    // CUIT 20123456786: sum=148, rem=5, check=6 ✅
    const clienteCreado = { id: 'uuid-1', nombre: 'García Juan', cuit: '20123456786' }
    const chain = mockChain()
    chain.single.mockResolvedValue({ data: clienteCreado, error: null })

    const result = await clientesService.create({ nombre: 'García Juan', cuit: '20123456786' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.cuit).toBe('20123456786')
  })

  it('retorna CONFLICT si el CUIT ya existe', async () => {
    const chain = mockChain()
    chain.single.mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } })

    const result = await clientesService.create({ nombre: 'García Juan', cuit: '20123456786' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CONFLICT')
  })
})

describe('clientesService.softDelete', () => {
  beforeEach(() => jest.clearAllMocks())

  it('setea deleted_at en el registro', async () => {
    mockChain({ eq: jest.fn().mockResolvedValue({ error: null }) })

    const result = await clientesService.softDelete('uuid-1')
    expect(result.ok).toBe(true)
  })
})
