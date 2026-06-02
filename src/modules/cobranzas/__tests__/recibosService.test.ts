import { recibosService } from '../services/recibosService'

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
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    ...terminal,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('recibosService.registrar', () => {
  beforeEach(() => jest.clearAllMocks())

  const validBase = {
    cliente_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    fecha: '2026-04-15',
    tipo_pago: 'TRANSFERENCIA',
    importe: 5000,
    imputaciones: [],
  }

  it('valida que el importe sea positivo', async () => {
    const result = await recibosService.registrar({ ...validBase, importe: -100 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('valida campos requeridos para USD', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      tipo_pago: 'USD',
      importe_usd: undefined,
      tipo_cambio: undefined,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('valida campos requeridos para CHEQUE', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      tipo_pago: 'CHEQUE',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza si las imputaciones superan el importe del recibo', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      importe: 1000,
      imputaciones: [
        { liquidacion_id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479', importe: 600 },
        { liquidacion_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479', importe: 600 },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('registra recibo sin imputaciones (queda saldo a favor, serie C)', async () => {
    const recibos = [{ id: 'r-1', numero_recibo: 'C-0100', cliente_id: 'c-1', importe: 5000, anulado: false }]
    mockRpc.mockResolvedValue({ data: recibos, error: null })

    const result = await recibosService.registrar(validBase)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].numero_recibo).toBe('C-0100')
    }
    expect(mockRpc).toHaveBeenCalledWith('fn_registrar_recibo', expect.objectContaining({
      p_cliente_id: validBase.cliente_id,
      p_importe: 5000,
      p_imputaciones: [],
    }))
  })

  it('registra recibo con imputaciones inline', async () => {
    const recibos = [{ id: 'r-2', numero_recibo: 'A-0100', cliente_id: 'c-1', importe: 5000 }]
    mockRpc.mockResolvedValue({ data: recibos, error: null })

    const result = await recibosService.registrar({
      ...validBase,
      imputaciones: [{ liquidacion_id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479', importe: 3000 }],
    })
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_registrar_recibo', expect.objectContaining({
      p_imputaciones: [{ liquidacion_id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479', importe: 3000 }],
    }))
  })

  it('auto-split: el RPC devuelve 2 recibos cuando las imputaciones son mixtas', async () => {
    const recibos = [
      { id: 'r-a', numero_recibo: 'A-0100', importe: 3000 },
      { id: 'r-c', numero_recibo: 'C-0100', importe: 2000 },
    ]
    mockRpc.mockResolvedValue({ data: recibos, error: null })

    const result = await recibosService.registrar({
      ...validBase,
      importe: 5000,
      imputaciones: [
        { liquidacion_id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479', importe: 3000 },
        { liquidacion_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479', importe: 2000 },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(2)
  })

  it('retorna DB_ERROR si la RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB down' } })

    const result = await recibosService.registrar(validBase)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })

  it('crea cheque antes de registrar para tipo_pago=CHEQUE', async () => {
    mockChain({ single: jest.fn().mockResolvedValue({ data: { id: 'cheque-1' }, error: null }) })
    mockRpc.mockResolvedValue({ data: [{ id: 'r-3', numero_recibo: 'A-0100' }], error: null })

    const result = await recibosService.registrar({
      ...validBase,
      tipo_pago: 'CHEQUE',
      cheque_numero: '0001',
      cheque_banco: 'Nación',
    })
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_registrar_recibo', expect.objectContaining({
      p_cheque_id: 'cheque-1',
    }))
  })

  it('rechaza vuelto en efectivo si tipo_pago no es CHEQUE', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      tipo_pago: 'TRANSFERENCIA',
      vuelto_efectivo: 100,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza vuelto >= importe del recibo', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      tipo_pago: 'CHEQUE',
      cheque_numero: '1',
      cheque_banco: 'X',
      importe: 1000,
      vuelto_efectivo: 1000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('inserta el cheque por el importe menos el vuelto (caso cheque + vuelto)', async () => {
    const chequeInsert = jest.fn().mockResolvedValue({ data: { id: 'cheque-vuelto' }, error: null })
    mockChain({ single: chequeInsert })
    mockRpc.mockResolvedValue({
      data: [
        { id: 'r-a', numero_recibo: 'A-0100', importe: 8000 },
        { id: 'r-c', numero_recibo: 'C-0100', importe: 2000 },
      ],
      error: null,
    })

    const result = await recibosService.registrar({
      ...validBase,
      tipo_pago: 'CHEQUE',
      importe: 10000,
      cheque_numero: '1234',
      cheque_banco: 'Nación',
      vuelto_efectivo: 2000,
    })
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_registrar_recibo', expect.objectContaining({
      p_vuelto_efectivo: 2000,
    }))
  })
})

describe('recibosService.anular', () => {
  beforeEach(() => jest.clearAllMocks())

  it('llama a fn_anular_recibo', async () => {
    const recibo = { id: 'r-1', anulado: true }
    mockRpc.mockResolvedValue({ data: recibo, error: null })

    const result = await recibosService.anular('r-1', 'duplicado')
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_anular_recibo', {
      p_recibo_id: 'r-1',
      p_motivo: 'duplicado',
    })
  })

  it('devuelve DB_ERROR cuando la RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'no admin' } })

    const result = await recibosService.anular('r-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
