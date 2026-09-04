import { saldoInicialService } from '../services/saldoInicialService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc = supabase.rpc as jest.Mock

const CLIENTE = '3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'

function mockChain(terminal: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    ...terminal,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('saldoInicialService.getByCliente', () => {
  beforeEach(() => jest.clearAllMocks())

  it('devuelve la deuda inicial del cliente', async () => {
    const chain = mockChain({
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'l-1',
          tipo_liquidacion: 'SALDO_INICIAL',
          fecha_liquidacion: '2026-09-03',
          importe_liquidado: 50000,
          detalle: 'Cierre del Excel',
          imputaciones: [{ importe: 20000 }],
        },
        error: null,
      }),
    })

    const result = await saldoInicialService.getByCliente(CLIENTE)

    expect(chain.eq).toHaveBeenCalledWith('tipo_liquidacion', 'SALDO_INICIAL')
    expect(chain.neq).toHaveBeenCalledWith('estado', 'ANULADA')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({
        tipo: 'DEUDA',
        id: 'l-1',
        fecha: '2026-09-03',
        importe: 50000,
        detalle: 'Cierre del Excel',
        imputado: 20000,
      })
    }
  })

  it('devuelve el saldo a favor si no hay deuda inicial', async () => {
    const chain = mockChain({
      maybeSingle: jest
        .fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: {
            id: 'r-1',
            tipo_pago: 'SALDO_INICIAL',
            fecha: '2026-09-01',
            importe: 80000,
            notas: 'Pagó de más en agosto',
            total_imputado: 0,
            saldo_libre: 80000,
          },
          error: null,
        }),
    })

    const result = await saldoInicialService.getByCliente(CLIENTE)

    expect(chain.eq).toHaveBeenCalledWith('tipo_pago', 'SALDO_INICIAL')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({
        tipo: 'FAVOR',
        id: 'r-1',
        fecha: '2026-09-01',
        importe: 80000,
        detalle: 'Pagó de más en agosto',
        imputado: 0,
      })
    }
  })

  it('devuelve null si el cliente no tiene saldo inicial', async () => {
    mockChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })

    const result = await saldoInicialService.getByCliente(CLIENTE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })
})

describe('saldoInicialService.guardar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rechaza importes que no son mayores a 0', async () => {
    const result = await saldoInicialService.guardar({
      cliente_id: CLIENTE,
      tipo: 'DEUDA',
      fecha_liquidacion: '2026-09-03',
      importe: 0,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('llama al RPC con los datos del formulario (deuda)', async () => {
    mockRpc.mockResolvedValue({
      data: { tipo: 'DEUDA', id: 'l-1', importe: 120000 },
      error: null,
    })

    const result = await saldoInicialService.guardar({
      cliente_id: CLIENTE,
      tipo: 'DEUDA',
      fecha_liquidacion: '2026-09-03',
      importe: '120000',
      detalle: 'Deuda al cierre del Excel',
    })

    expect(mockRpc).toHaveBeenCalledWith('fn_guardar_saldo_inicial', {
      p_cliente_id: CLIENTE,
      p_fecha: '2026-09-03',
      p_importe: 120000,
      p_detalle: 'Deuda al cierre del Excel',
      p_a_favor: false,
    })
    expect(result.ok).toBe(true)
  })

  it('marca p_a_favor cuando el cliente tenía plata a favor', async () => {
    mockRpc.mockResolvedValue({
      data: { tipo: 'FAVOR', id: 'r-1', importe: 45000 },
      error: null,
    })

    const result = await saldoInicialService.guardar({
      cliente_id: CLIENTE,
      tipo: 'FAVOR',
      fecha_liquidacion: '2026-09-03',
      importe: 45000,
    })

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_guardar_saldo_inicial',
      expect.objectContaining({ p_importe: 45000, p_a_favor: true })
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.tipo).toBe('FAVOR')
  })

  it('propaga el error de la DB (ej: saldo menor a lo ya cobrado)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'El saldo inicial (100) no puede ser menor a lo que ya se cobró contra él (500)',
      },
    })

    const result = await saldoInicialService.guardar({
      cliente_id: CLIENTE,
      tipo: 'DEUDA',
      fecha_liquidacion: '2026-09-03',
      importe: 100,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
