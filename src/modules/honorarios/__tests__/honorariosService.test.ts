import { honorariosService } from '../services/honorariosService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc  = supabase.rpc as jest.Mock

function mockChain(terminal: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    is:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    ...terminal,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('honorariosService.getActivoByCliente', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna null cuando no hay honorario activo', async () => {
    mockChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    const result = await honorariosService.getActivoByCliente('uuid-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('retorna el honorario activo', async () => {
    const honorario = { id: 'h-1', cliente_id: 'uuid-1', monto: 85000, vigente_hasta: null }
    mockChain({ maybeSingle: jest.fn().mockResolvedValue({ data: honorario, error: null }) })
    const result = await honorariosService.getActivoByCliente('uuid-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data?.monto).toBe(85000)
  })
})

describe('honorariosService.aplicarAjuste', () => {
  beforeEach(() => jest.clearAllMocks())

  it('llama a fn_aplicar_ajuste_honorario via RPC', async () => {
    const nuevoHonorario = { id: 'h-2', monto: 94350, porcentaje_ajuste: 11 }
    mockRpc.mockResolvedValue({ data: nuevoHonorario, error: null })

    const result = await honorariosService.aplicarAjuste('uuid-1', 11, 'Ajuste inflación')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.monto).toBe(94350)
    expect(mockRpc).toHaveBeenCalledWith('fn_aplicar_ajuste_honorario', expect.objectContaining({
      p_cliente_id: 'uuid-1',
      p_porcentaje: 11,
    }))
  })

  it('retorna DB_ERROR si la RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'No hay honorario activo' } })

    const result = await honorariosService.aplicarAjuste('uuid-1', 5)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
