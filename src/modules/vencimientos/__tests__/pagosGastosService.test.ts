import { pagosGastosService } from '../services/pagosGastosService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc = supabase.rpc as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const GASTO_ID = 'a47ac10b-58cc-4372-a567-0e02b2c3d111'

describe('pagosGastosService.registrar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rechaza importe negativo', async () => {
    const result = await pagosGastosService.registrar({
      categoria_id: UUID,
      concepto: 'Luz',
      fecha_pago: '2026-05-20',
      medio_pago: 'TRANSFERENCIA',
      importe: -1,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  // Paola usa los gastos recurrentes como checklist: marca como pagado un
  // vencimiento anual cuyo importe todavia no conoce. Antes tenia que
  // cargar 0,01 para que el formulario la dejara pasar.
  it('acepta importe 0 para marcar un vencimiento como pagado', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'p-0', importe: 0 }, error: null })

    const result = await pagosGastosService.registrar({
      categoria_id: UUID,
      gasto_recurrente_id: GASTO_ID,
      concepto: 'Ingresos brutos anual',
      fecha_pago: '2026-05-20',
      medio_pago: 'TRANSFERENCIA',
      importe: 0,
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_pago_gasto',
      expect.objectContaining({ p_importe: 0, p_gasto_recurrente_id: GASTO_ID })
    )
  })

  it('llama al RPC y delega el avance del vencimiento en la base', async () => {
    const pago = {
      id: 'p-1',
      categoria_id: UUID,
      gasto_recurrente_id: GASTO_ID,
      concepto: 'Luz',
      importe: 45000,
    }
    mockRpc.mockResolvedValue({ data: pago, error: null })

    const result = await pagosGastosService.registrar({
      categoria_id: UUID,
      gasto_recurrente_id: GASTO_ID,
      concepto: 'Luz',
      fecha_pago: '2026-05-20',
      medio_pago: 'TRANSFERENCIA',
      importe: 45000,
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_pago_gasto',
      expect.objectContaining({
        p_categoria_id: UUID,
        p_gasto_recurrente_id: GASTO_ID,
        p_importe: 45000,
      })
    )
  })
})

describe('pagosGastosService.getResumenAnual', () => {
  beforeEach(() => jest.clearAllMocks())

  it('suma por categoría, por gasto y por mes', async () => {
    const pagos = [
      {
        id: 'p-1',
        categoria_id: UUID,
        categoria_nombre: 'Servicios',
        categoria_color: '#64748b',
        gasto_recurrente_id: GASTO_ID,
        gasto_descripcion: 'Luz',
        concepto: 'Luz enero',
        fecha_pago: '2026-01-20',
        medio_pago: 'TRANSFERENCIA',
        importe: 100,
        fecha_vencimiento_pagado: '2026-01-25',
        comprobante_url: null,
        notas: null,
        anio: 2026,
        mes: 1,
      },
      {
        id: 'p-2',
        categoria_id: UUID,
        categoria_nombre: 'Servicios',
        categoria_color: '#64748b',
        gasto_recurrente_id: GASTO_ID,
        gasto_descripcion: 'Luz',
        concepto: 'Luz febrero',
        fecha_pago: '2026-02-20',
        medio_pago: 'TRANSFERENCIA',
        importe: 150,
        fecha_vencimiento_pagado: '2026-02-25',
        comprobante_url: null,
        notas: null,
        anio: 2026,
        mes: 2,
      },
    ]
    mockChain({ order: jest.fn().mockResolvedValue({ data: pagos, error: null }) })

    const result = await pagosGastosService.getResumenAnual(2026)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.total).toBe(250)
      expect(result.data.porCategoria[0].total).toBe(250)
      expect(result.data.porGasto[0].gasto_descripcion).toBe('Luz')
      expect(result.data.mensualPorGasto).toHaveLength(2)
    }
  })
})

describe('pagosGastosService.eliminar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('delega el borrado en el RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await pagosGastosService.eliminar('p-1')

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_eliminar_pago_gasto', { p_pago_id: 'p-1' })
  })

  it('devuelve DB_ERROR si el RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'No autorizado' } })

    const result = await pagosGastosService.eliminar('p-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DB_ERROR')
      expect(result.error).toBe('No autorizado')
    }
  })
})
