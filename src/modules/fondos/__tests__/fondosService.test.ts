import { fondosService } from '../services/fondosService'
import { chequesService } from '../services/chequesService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }) },
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock
const mockRpc = supabase.rpc as jest.Mock

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

// ── fondosService.getMovimientos ─────────────────────────────

describe('fondosService.getMovimientos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna lista de movimientos paginada', async () => {
    const movs = [{ id: 'm-1', tipo_movimiento: 'INGRESO', importe_banco: 50000 }]
    mockChain({ range: jest.fn().mockResolvedValue({ data: movs, error: null, count: 1 }) })

    const result = await fondosService.getMovimientos()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rows).toHaveLength(1)
      expect(result.data.total).toBe(1)
    }
  })

  it('retorna DB_ERROR si falla', async () => {
    mockChain({
      range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await fondosService.getMovimientos()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── fondosService.getSaldo ───────────────────────────────────

describe('fondosService.getSaldo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna saldos como números', async () => {
    const saldo = {
      saldo_banco: '150000',
      saldo_efectivo: '25000',
      saldo_usd: '500',
      saldo_taralo: '80000',
      saldo_cheques_cartera: '220000',
    }
    mockChain({ single: jest.fn().mockResolvedValue({ data: saldo, error: null }) })

    const result = await fondosService.getSaldo()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.saldo_banco).toBe(150000)
      expect(result.data.saldo_efectivo).toBe(25000)
      expect(result.data.saldo_usd).toBe(500)
      expect(result.data.saldo_taralo).toBe(80000)
      expect(result.data.saldo_cheques_cartera).toBe(220000)
    }
  })

  it('trata nulls como 0', async () => {
    mockChain({
      single: jest.fn().mockResolvedValue({
        data: {
          saldo_banco: null,
          saldo_efectivo: null,
          saldo_usd: null,
          saldo_taralo: null,
          saldo_cheques_cartera: null,
        },
        error: null,
      }),
    })

    const result = await fondosService.getSaldo()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.saldo_banco).toBe(0)
      expect(result.data.saldo_efectivo).toBe(0)
      expect(result.data.saldo_usd).toBe(0)
      expect(result.data.saldo_taralo).toBe(0)
      expect(result.data.saldo_cheques_cartera).toBe(0)
    }
  })
})

// ── fondosService.registrar ──────────────────────────────────

describe('fondosService.registrar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si todos los importes son 0', async () => {
    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'Test',
      importe_banco: 0,
      importe_efectivo: 0,
      importe_usd: 0,
      importe_taralo: 0,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el concepto es muy corto', async () => {
    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'X',
      importe_banco: 100,
      importe_efectivo: 0,
      importe_usd: 0,
      importe_taralo: 0,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('registra el movimiento correctamente', async () => {
    const mov = { id: 'm-1', tipo_movimiento: 'INGRESO', importe_banco: 50000 }
    mockChain({ single: jest.fn().mockResolvedValue({ data: mov, error: null }) })

    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'Cobro cliente',
      importe_banco: 50000,
      importe_efectivo: 0,
      importe_usd: 0,
      importe_taralo: 0,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.tipo_movimiento).toBe('INGRESO')
  })

  it('registra un aporte a Taralo aunque el resto de importes sea 0', async () => {
    const mov = { id: 'm-2', tipo_movimiento: 'INGRESO', importe_taralo: 80000 }
    mockChain({ single: jest.fn().mockResolvedValue({ data: mov, error: null }) })

    const result = await fondosService.registrar({
      tipo_movimiento: 'INGRESO',
      fecha: '2026-04-21',
      concepto: 'Aporte a Taralo',
      importe_banco: 0,
      importe_efectivo: 0,
      importe_usd: 0,
      importe_taralo: 80000,
    })
    expect(result.ok).toBe(true)
  })
})

// ── chequesService.getAll ────────────────────────────────────

describe('chequesService.getAll', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna cheques en cartera paginados', async () => {
    const cheques = [{ id: 'c-1', estado: 'EN_CARTERA', importe: 10000 }]
    // Con opts.estado, la cadena termina en .eq(), no en .range()
    const chain = mockChain()
    chain.eq = jest.fn().mockResolvedValue({ data: cheques, error: null, count: 1 })

    const result = await chequesService.getAll({ estado: 'EN_CARTERA' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rows).toHaveLength(1)
      expect(result.data.total).toBe(1)
    }
  })
})

// ── chequesService.actualizarEstado ──────────────────────────

describe('chequesService.actualizarEstado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('actualiza el estado a DEPOSITADO', async () => {
    const cheque = { id: 'c-1', estado: 'DEPOSITADO', fecha_cobro: '2026-04-21' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: cheque, error: null }) })

    const result = await chequesService.actualizarEstado('c-1', 'DEPOSITADO', '2026-04-21')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.estado).toBe('DEPOSITADO')
      expect(result.data.fecha_cobro).toBe('2026-04-21')
    }
  })

  it('retorna DB_ERROR si falla', async () => {
    mockChain({
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await chequesService.actualizarEstado('c-1', 'ANULADO')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── chequesService.confirmarAcreditacion ─────────────────────

describe('chequesService.confirmarAcreditacion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('confirma la acreditación de un cheque depositado', async () => {
    const cheque = { id: 'c-1', estado: 'DEPOSITADO', acreditacion_confirmada: true }
    mockChain({ single: jest.fn().mockResolvedValue({ data: cheque, error: null }) })

    const result = await chequesService.confirmarAcreditacion('c-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.acreditacion_confirmada).toBe(true)
  })

  it('retorna VALIDATION_ERROR si el cheque está en cartera o anulado (0 filas afectadas)', async () => {
    mockChain({
      single: jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
    })

    const result = await chequesService.confirmarAcreditacion('c-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna DB_ERROR ante otro tipo de falla', async () => {
    mockChain({
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await chequesService.confirmarAcreditacion('c-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── chequesService.desmarcarAcreditacion ─────────────────────

describe('chequesService.desmarcarAcreditacion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('desmarca la acreditación de un cheque', async () => {
    const cheque = { id: 'c-1', estado: 'DEPOSITADO', acreditacion_confirmada: false }
    mockChain({ single: jest.fn().mockResolvedValue({ data: cheque, error: null }) })

    const result = await chequesService.desmarcarAcreditacion('c-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.acreditacion_confirmada).toBe(false)
  })
})

// ── chequesService.endosarAProveedor ─────────────────────────

describe('chequesService.endosarAProveedor', () => {
  beforeEach(() => jest.clearAllMocks())

  it('llama al RPC con los parámetros correctos y retorna el pago', async () => {
    const pago = { id: 'p-1', compra_id: 'compra-1', importe: 5000, tipo_pago: 'CHEQUE' }
    mockRpc.mockResolvedValue({ data: pago, error: null })

    const result = await chequesService.endosarAProveedor({
      chequeId: 'ch-1',
      compraId: 'compra-1',
      importe: 5000,
      fechaPago: '2026-04-21',
      notas: 'Pago con cheque de cliente',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.importe).toBe(5000)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_endosar_cheque_a_proveedor',
      expect.objectContaining({
        p_cheque_id: 'ch-1',
        p_compra_id: 'compra-1',
        p_importe: 5000,
        p_fecha_pago: '2026-04-21',
        p_notas: 'Pago con cheque de cliente',
      })
    )
  })

  it('retorna DB_ERROR si el RPC falla (ej: cheque no está en cartera, o importe supera el cheque)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'El cheque no está en cartera (estado actual: ENDOSADO)' },
    })

    const result = await chequesService.endosarAProveedor({
      chequeId: 'ch-1',
      compraId: 'compra-1',
      importe: 5000,
      fechaPago: '2026-04-21',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── chequesService.crearManual ───────────────────────────────

describe('chequesService.crearManual', () => {
  const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si es de tercero y no se eligió cliente', async () => {
    const result = await chequesService.crearManual({
      tipo: 'TERCERO',
      numero: '123',
      banco: 'Nación',
      importe: 10000,
      fecha_emision: '2026-04-21',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('retorna VALIDATION_ERROR si es propio y no se eligió proveedor', async () => {
    const result = await chequesService.crearManual({
      tipo: 'PROPIO',
      numero: '123',
      banco: 'Nación',
      importe: 10000,
      fecha_emision: '2026-04-21',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el importe no es positivo', async () => {
    const result = await chequesService.crearManual({
      tipo: 'TERCERO',
      numero: '123',
      banco: 'Nación',
      importe: 0,
      fecha_emision: '2026-04-21',
      cliente_id: UUID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('llama al RPC con los parámetros correctos para un cheque de tercero', async () => {
    const cheque = { id: 'ch-1', tipo: 'TERCERO', estado: 'EN_CARTERA', importe: 10000 }
    mockRpc.mockResolvedValue({ data: cheque, error: null })

    const result = await chequesService.crearManual({
      tipo: 'TERCERO',
      numero: '123',
      banco: 'Nación',
      importe: 10000,
      fecha_emision: '2026-04-21',
      cliente_id: UUID,
      notas: 'Cargado al migrar del Excel',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('EN_CARTERA')
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_cheque_manual',
      expect.objectContaining({
        p_tipo: 'TERCERO',
        p_numero: '123',
        p_banco: 'Nación',
        p_importe: 10000,
        p_fecha_emision: '2026-04-21',
        p_cliente_id: UUID,
        p_notas: 'Cargado al migrar del Excel',
      })
    )
  })

  it('llama al RPC con los parámetros correctos para un cheque propio', async () => {
    const cheque = { id: 'ch-2', tipo: 'PROPIO', estado: 'EN_CARTERA', importe: 5000 }
    mockRpc.mockResolvedValue({ data: cheque, error: null })

    const result = await chequesService.crearManual({
      tipo: 'PROPIO',
      numero: '456',
      banco: 'Galicia',
      importe: 5000,
      fecha_emision: '2026-04-21',
      proveedor_id: UUID,
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_cheque_manual',
      expect.objectContaining({ p_tipo: 'PROPIO', p_proveedor_id: UUID })
    )
  })

  it('retorna DB_ERROR si el RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await chequesService.crearManual({
      tipo: 'TERCERO',
      numero: '123',
      banco: 'Nación',
      importe: 10000,
      fecha_emision: '2026-04-21',
      cliente_id: UUID,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
