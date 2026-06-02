import { imputacionesService } from '../services/imputacionesService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc = supabase.rpc as jest.Mock

function mockChain(terminal: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ...terminal,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('imputacionesService.imputar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rechaza importe inválido', async () => {
    const result = await imputacionesService.imputar({
      recibo_id: 'r-1',
      liquidacion_id: 'l-1',
      importe: 0,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza ids vacíos', async () => {
    const result = await imputacionesService.imputar({
      recibo_id: '',
      liquidacion_id: 'l-1',
      importe: 100,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('llama a fn_imputar_recibo con los parámetros correctos', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'i-1', importe: 500 }, error: null })

    const result = await imputacionesService.imputar({
      recibo_id: 'r-1',
      liquidacion_id: 'l-1',
      importe: 500,
      notas: 'parcial',
    })
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_imputar_recibo', {
      p_recibo_id: 'r-1',
      p_liquidacion_id: 'l-1',
      p_importe: 500,
      p_notas: 'parcial',
    })
  })

  it('devuelve DB_ERROR cuando la RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'excede saldo' } })
    const result = await imputacionesService.imputar({
      recibo_id: 'r-1',
      liquidacion_id: 'l-1',
      importe: 100,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

describe('imputacionesService.eliminar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('llama a fn_eliminar_imputacion', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    const result = await imputacionesService.eliminar('i-1')
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_eliminar_imputacion', {
      p_imputacion_id: 'i-1',
    })
  })
})

describe('imputacionesService.getByRecibo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('devuelve imputaciones del recibo', async () => {
    mockChain({
      order: jest.fn().mockResolvedValue({
        data: [{ id: 'i-1', recibo_id: 'r-1', importe: 100 }],
        error: null,
      }),
    })
    const result = await imputacionesService.getByRecibo('r-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })
})
