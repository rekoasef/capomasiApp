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
    in: jest.fn().mockReturnThis(),
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

  const CLIENTE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  const LIQ_A = 'a47ac10b-58cc-4372-a567-0e02b2c3d479'
  const LIQ_B = 'b47ac10b-58cc-4372-a567-0e02b2c3d479'

  const validBase = {
    cliente_id: CLIENTE,
    fecha: '2026-04-15',
    medios: [{ tipo_pago: 'TRANSFERENCIA', importe: 5000 }],
    imputaciones: [],
  }

  it('valida que el importe sea positivo', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      medios: [{ tipo_pago: 'TRANSFERENCIA', importe: -100 }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('exige al menos un medio de pago', async () => {
    const result = await recibosService.registrar({ ...validBase, medios: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('valida campos requeridos para USD', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      medios: [{ tipo_pago: 'USD', importe: 5000 }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('valida campos requeridos para CHEQUE', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      medios: [{ tipo_pago: 'CHEQUE', importe: 5000 }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza si las imputaciones superan el total de los medios', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      medios: [{ tipo_pago: 'TRANSFERENCIA', importe: 1000 }],
      imputaciones: [
        { liquidacion_id: LIQ_A, importe: 600 },
        { liquidacion_id: LIQ_B, importe: 600 },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('registra recibo sin imputaciones (queda saldo a favor)', async () => {
    const recibos = [
      { id: 'r-1', numero_recibo: 'C-0100', cliente_id: 'c-1', importe: 5000, anulado: false },
    ]
    mockRpc.mockResolvedValue({ data: recibos, error: null })

    const result = await recibosService.registrar(validBase)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].numero_recibo).toBe('C-0100')
    }
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_recibo',
      expect.objectContaining({
        p_cliente_id: CLIENTE,
        p_importe: 5000,
        p_imputaciones: [],
        p_medios: [{ tipo_pago: 'TRANSFERENCIA', importe: 5000 }],
      })
    )
  })

  it('registra recibo con imputaciones inline', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'r-2', numero_recibo: 'C-0101', cliente_id: 'c-1', importe: 5000 }],
      error: null,
    })

    const result = await recibosService.registrar({
      ...validBase,
      imputaciones: [{ liquidacion_id: LIQ_A, importe: 3000 }],
    })
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_recibo',
      expect.objectContaining({
        p_imputaciones: [{ liquidacion_id: LIQ_A, importe: 3000 }],
      })
    )
  })

  // El caso de Paola: le pagan con dos cheques y el efectivo que completa el
  // monto exacto. Antes salían tres recibos; ahora es uno con tres medios.
  it('crea un solo recibo con dos cheques y efectivo, y un cheque por cada uno', async () => {
    const single = jest
      .fn()
      .mockResolvedValueOnce({ data: { id: 'cheque-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'cheque-2' }, error: null })
    mockChain({ single })
    mockRpc.mockResolvedValue({
      data: [{ id: 'r-3', numero_recibo: 'C-0137', importe: 1315400.75 }],
      error: null,
    })

    const result = await recibosService.registrar({
      ...validBase,
      medios: [
        { tipo_pago: 'CHEQUE', importe: 531398, cheque_numero: '1', cheque_banco: 'Nación' },
        { tipo_pago: 'CHEQUE', importe: 763510, cheque_numero: '2', cheque_banco: 'Galicia' },
        { tipo_pago: 'EFECTIVO', importe: 20492.75 },
      ],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
    expect(single).toHaveBeenCalledTimes(2)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_recibo',
      expect.objectContaining({
        p_importe: 1315400.75,
        p_medios: [
          { tipo_pago: 'CHEQUE', importe: 531398, cheque_id: 'cheque-1' },
          { tipo_pago: 'CHEQUE', importe: 763510, cheque_id: 'cheque-2' },
          expect.objectContaining({ tipo_pago: 'EFECTIVO', importe: 20492.75 }),
        ],
      })
    )
  })

  it('retorna DB_ERROR si la RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB down' } })

    const result = await recibosService.registrar(validBase)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })

  it('borra los cheques ya creados si la RPC falla', async () => {
    const chain = mockChain({
      single: jest.fn().mockResolvedValue({ data: { id: 'cheque-1' }, error: null }),
    })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB down' } })

    const result = await recibosService.registrar({
      ...validBase,
      medios: [{ tipo_pago: 'CHEQUE', importe: 5000, cheque_numero: '1', cheque_banco: 'Nación' }],
    })

    expect(result.ok).toBe(false)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.in).toHaveBeenCalledWith('id', ['cheque-1'])
  })

  it('crea el cheque antes de registrar y lo manda como medio', async () => {
    mockChain({ single: jest.fn().mockResolvedValue({ data: { id: 'cheque-1' }, error: null }) })
    mockRpc.mockResolvedValue({ data: [{ id: 'r-4', numero_recibo: 'C-0102' }], error: null })

    const result = await recibosService.registrar({
      ...validBase,
      medios: [
        { tipo_pago: 'CHEQUE', importe: 5000, cheque_numero: '0001', cheque_banco: 'Nación' },
      ],
    })
    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_recibo',
      expect.objectContaining({
        p_medios: [{ tipo_pago: 'CHEQUE', importe: 5000, cheque_id: 'cheque-1' }],
      })
    )
  })

  it('rechaza vuelto en efectivo si el medio no es un cheque', async () => {
    const result = await recibosService.registrar({ ...validBase, vuelto_efectivo: 100 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza vuelto en efectivo si hay más de un medio', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      medios: [
        { tipo_pago: 'CHEQUE', importe: 5000, cheque_numero: '1', cheque_banco: 'X' },
        { tipo_pago: 'EFECTIVO', importe: 1000 },
      ],
      vuelto_efectivo: 100,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza vuelto >= importe del recibo', async () => {
    const result = await recibosService.registrar({
      ...validBase,
      medios: [{ tipo_pago: 'CHEQUE', importe: 1000, cheque_numero: '1', cheque_banco: 'X' }],
      vuelto_efectivo: 1000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('inserta el cheque por el importe menos el vuelto', async () => {
    const insert = jest.fn().mockReturnThis()
    mockChain({
      insert,
      single: jest.fn().mockResolvedValue({ data: { id: 'cheque-vuelto' }, error: null }),
    })
    mockRpc.mockResolvedValue({
      data: [{ id: 'r-5', numero_recibo: 'C-0103', importe: 10000 }],
      error: null,
    })

    const result = await recibosService.registrar({
      ...validBase,
      medios: [
        { tipo_pago: 'CHEQUE', importe: 10000, cheque_numero: '1234', cheque_banco: 'Nación' },
      ],
      vuelto_efectivo: 2000,
    })

    expect(result.ok).toBe(true)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ importe: 8000 }))
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_recibo',
      expect.objectContaining({ p_vuelto_efectivo: 2000, p_importe: 10000 })
    )
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
