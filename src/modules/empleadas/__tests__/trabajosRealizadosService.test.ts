import { trabajosRealizadosService } from '../services/trabajosRealizadosService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc = supabase.rpc as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('trabajosRealizadosService.crear', () => {
  beforeEach(() => jest.clearAllMocks())

  it('valida campos requeridos', async () => {
    const result = await trabajosRealizadosService.crear({
      empleada_id: UUID,
      fecha: '2026-04-28',
      descripcion: '',
      tipo_trabajo: '',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('inserta trabajo y deriva período desde la fecha', async () => {
    mockChain({
      single: jest.fn().mockResolvedValue({
        data: { id: 't-1', periodo_mes: 4, periodo_anio: 2026 },
        error: null,
      }),
    })

    const result = await trabajosRealizadosService.crear({
      empleada_id: UUID,
      fecha: '2026-04-28',
      cliente_id: null,
      tipo_trabajo: 'BALANCE',
      descripcion: 'Cierre mensual',
    })

    expect(result.ok).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('trabajos_realizados')
  })
})

describe('trabajosRealizadosService.getByPeriodo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lista trabajos del período filtrando por empleada si corresponde', async () => {
    const chain = mockChain()
    chain.eq = jest.fn().mockReturnThis()
    chain.order = jest.fn()
    chain.order.mockImplementationOnce(() => chain)
    chain.order.mockImplementationOnce(() => Promise.resolve({
      data: [{ id: 't-1', periodo_mes: 4, periodo_anio: 2026 }],
      error: null,
    }))

    const result = await trabajosRealizadosService.getByPeriodo({
      periodo_mes: 4,
      periodo_anio: 2026,
      empleada_id: UUID,
    })

    expect(result.ok).toBe(true)
    expect(chain.eq).toHaveBeenCalledWith('periodo_mes', 4)
    expect(chain.eq).toHaveBeenCalledWith('periodo_anio', 2026)
    expect(chain.eq).toHaveBeenCalledWith('empleada_id', UUID)
  })
})

describe('trabajosRealizadosService.aprobar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('valida importe si genera comisión', async () => {
    const result = await trabajosRealizadosService.aprobar({
      trabajo_id: UUID,
      genera_comision: true,
      importe_comision: null,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('llama a la rpc de aprobación', async () => {
    mockRpc.mockResolvedValue({ data: { id: 't-1', aprobado_at: '2026-04-28' }, error: null })

    const result = await trabajosRealizadosService.aprobar({
      trabajo_id: UUID,
      genera_comision: true,
      importe_comision: 25000,
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_aprobar_trabajo_realizado', {
      p_trabajo_id: UUID,
      p_genera_comision: true,
      p_importe_comision: 25000,
    })
  })
})

describe('trabajosRealizadosService.importarComisiones', () => {
  beforeEach(() => jest.clearAllMocks())

  it('llama a la rpc de importación', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'l-1' }], error: null })

    const result = await trabajosRealizadosService.importarComisiones({
      empleada_id: UUID,
      periodo_mes: 4,
      periodo_anio: 2026,
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_importar_comisiones_trabajos', {
      p_empleada_id: UUID,
      p_periodo_mes: 4,
      p_periodo_anio: 2026,
    })
  })
})
