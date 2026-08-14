import { notasEmpleadasService } from '../services/notasEmpleadasService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc = supabase.rpc as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// ── getAll ───────────────────────────────────────────────────

describe('notasEmpleadasService.getAll', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna lista de notas', async () => {
    const notas = [
      { id: UUID, empleada_id: UUID, contenido: 'Traer documentación', finalizada: false },
    ]
    mockChain({ order: jest.fn().mockResolvedValue({ data: notas, error: null }) })

    const result = await notasEmpleadasService.getAll()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('filtra por estado ACTIVAS', async () => {
    const chain = mockChain({ order: jest.fn().mockResolvedValue({ data: [], error: null }) })

    await notasEmpleadasService.getAll({ estado: 'ACTIVAS' })
    expect(chain.eq).toHaveBeenCalledWith('finalizada', false)
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('retorna DB_ERROR si falla la query', async () => {
    mockChain({
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await notasEmpleadasService.getAll()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── create ───────────────────────────────────────────────────

describe('notasEmpleadasService.create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el contenido está vacío', async () => {
    const result = await notasEmpleadasService.create({ empleada_id: UUID, contenido: '  ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si empleada_id no es un uuid válido', async () => {
    const result = await notasEmpleadasService.create({
      empleada_id: 'no-es-uuid',
      contenido: 'Ok',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea la nota correctamente', async () => {
    const nota = {
      id: UUID,
      empleada_id: UUID,
      contenido: 'Traer documentación',
      finalizada: false,
    }
    mockChain({ single: jest.fn().mockResolvedValue({ data: nota, error: null }) })

    const result = await notasEmpleadasService.create({
      empleada_id: UUID,
      contenido: 'Traer documentación',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.contenido).toBe('Traer documentación')
  })
})

// ── finalizar ────────────────────────────────────────────────

describe('notasEmpleadasService.finalizar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('llama al RPC fn_finalizar_nota_empleada con el id de la nota', async () => {
    const nota = { id: UUID, empleada_id: UUID, contenido: 'x', finalizada: true }
    mockRpc.mockResolvedValue({ data: nota, error: null })

    const result = await notasEmpleadasService.finalizar(UUID)
    expect(mockRpc).toHaveBeenCalledWith('fn_finalizar_nota_empleada', { p_nota_id: UUID })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.finalizada).toBe(true)
  })

  it('retorna DB_ERROR si la nota no pertenece a la empleada', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Nota no encontrada o no pertenece al usuario' },
    })

    const result = await notasEmpleadasService.finalizar(UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── eliminar ─────────────────────────────────────────────────

describe('notasEmpleadasService.eliminar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('marca deleted_at y no elimina la fila', async () => {
    const chain = mockChain()
    chain.eq = jest.fn().mockResolvedValue({ error: null })

    const result = await notasEmpleadasService.eliminar(UUID)
    expect(result.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    )
  })
})
