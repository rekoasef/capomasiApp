import { reportesService } from '../services/reportesService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock

type Fila = { importe_liquidado: number | null; importe_facturado: number | null }

/**
 * El comparativo pega a dos tablas por período: `liquidaciones` (reales) y
 * `v_facturacion_historica_normalizada` (el Excel migrado). Cada cadena
 * termina en `.lte()`, así que ahí devolvemos el resultado.
 */
function mockTablas(porTabla: Record<string, Fila[] | { error: { message: string } }>) {
  mockFrom.mockImplementation((tabla: string) => {
    const resultado = porTabla[tabla] ?? []
    const final = Array.isArray(resultado)
      ? { data: resultado, error: null }
      : { data: null, error: resultado.error }
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue(final),
    }
    return chain
  })
}

const PERIODO_A = { desde: '2025-11-01', hasta: '2026-09-10' }
const PERIODO_B = { desde: '2024-11-01', hasta: '2025-10-31' }

describe('reportesService.getComparativoPeriodos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('suma la facturación histórica junto con las liquidaciones reales', async () => {
    mockTablas({
      liquidaciones: [{ importe_liquidado: 1000, importe_facturado: 1210 }],
      v_facturacion_historica_normalizada: [
        { importe_liquidado: 500, importe_facturado: 605 },
        { importe_liquidado: 300, importe_facturado: null },
      ],
    })

    const result = await reportesService.getComparativoPeriodos(PERIODO_A, PERIODO_B)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.periodoA).toMatchObject({
      cantidad: 3,
      total_liquidado: 1800,
      total_facturado: 2115,
    })
  })

  it('trata el importe liquidado nulo del Excel como cero', async () => {
    mockTablas({
      liquidaciones: [],
      v_facturacion_historica_normalizada: [{ importe_liquidado: null, importe_facturado: null }],
    })

    const result = await reportesService.getComparativoPeriodos(PERIODO_A, PERIODO_B)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.periodoA.total_liquidado).toBe(0)
  })

  it('devuelve DB_ERROR si falla la consulta a la histórica', async () => {
    mockTablas({
      liquidaciones: [],
      v_facturacion_historica_normalizada: { error: { message: 'vista caída' } },
    })

    const result = await reportesService.getComparativoPeriodos(PERIODO_A, PERIODO_B)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('DB_ERROR')
    expect(result.error).toBe('vista caída')
  })
})
