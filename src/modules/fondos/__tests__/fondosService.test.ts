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
    neq: jest.fn().mockReturnThis(),
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

// Paola: "los movimientos de tarallo y de dólares no los puedo ver en
// ningún lado". Las tarjetas de saldo filtran el listado por cuenta.
// Acá la query se encadena después de .range(), así que el mock tiene
// que devolver la cadena y recién resolver cuando se la espera.

describe('fondosService.getMovimientos — filtro por cuenta', () => {
  beforeEach(() => jest.clearAllMocks())

  function mockChainEncadenable() {
    const respuesta = { data: [], error: null, count: 0 }
    return mockChain({
      range: jest.fn().mockReturnThis(),
      then: (resolve: (v: typeof respuesta) => unknown) => Promise.resolve(respuesta).then(resolve),
    })
  }

  it('filtra por la columna de importe de la cuenta elegida', async () => {
    const chain = mockChainEncadenable()

    const result = await fondosService.getMovimientos({ cuenta: 'usd' })

    expect(result.ok).toBe(true)
    expect(chain.neq).toHaveBeenCalledWith('importe_usd', 0)
  })

  it('usa la columna de cheques en cartera, que no es un importe más', async () => {
    const chain = mockChainEncadenable()

    await fondosService.getMovimientos({ cuenta: 'cheques_cartera' })

    expect(chain.neq).toHaveBeenCalledWith('importe_cheques_cartera', 0)
  })

  it('sin cuenta no filtra por importe', async () => {
    const chain = mockChainEncadenable()

    await fondosService.getMovimientos({ desde: '2026-09-01' })

    expect(chain.gte).toHaveBeenCalledWith('fecha', '2026-09-01')
    expect(chain.neq).not.toHaveBeenCalled()
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

// ── fondosService.transferir con cotización ──────────────────
// Comprar dólares mueve importes distintos de cada lado (0083).

describe('fondosService.transferir', () => {
  beforeEach(() => jest.clearAllMocks())

  it('manda lo que entra cuando hay cambio de moneda', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await fondosService.transferir({
      origen: 'efectivo',
      destino: 'usd',
      importe: 1248000,
      importe_destino: 800,
      fecha: '2026-09-17',
      concepto: 'Compra de dólares',
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_transferir_fondos',
      expect.objectContaining({
        p_origen: 'efectivo',
        p_destino: 'usd',
        p_importe: 1248000,
        p_importe_destino: 800,
      })
    )
  })

  it('vale también vendiendo dólares', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fondosService.transferir({
      origen: 'usd',
      destino: 'banco',
      importe: 500,
      importe_destino: 790000,
      fecha: '2026-09-17',
      concepto: 'Venta de dólares',
    })

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_transferir_fondos',
      expect.objectContaining({ p_importe: 500, p_importe_destino: 790000 })
    )
  })

  it('entre cuentas en pesos no manda importe de destino', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fondosService.transferir({
      origen: 'banco',
      destino: 'efectivo',
      importe: 100000,
      importe_destino: 99000,
      fecha: '2026-09-17',
      concepto: 'Retiro de caja',
    })

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_transferir_fondos',
      expect.objectContaining({ p_importe: 100000, p_importe_destino: undefined })
    )
  })

  it('exige cuánto entra si hay cambio de moneda', async () => {
    const result = await fondosService.transferir({
      origen: 'efectivo',
      destino: 'usd',
      importe: 1248000,
      fecha: '2026-09-17',
      concepto: 'Compra de dólares',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.error).toMatch(/cuánto entra/i)
    }
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rechaza origen y destino iguales', async () => {
    const result = await fondosService.transferir({
      origen: 'usd',
      destino: 'usd',
      importe: 100,
      fecha: '2026-09-17',
      concepto: 'Nada',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
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

// ── chequesService.salidaSinFactura ──────────────────────────
// Paola cambia cheques en una cueva o los usa para algo suyo: salen
// de la cartera sin factura que imputar (migración 0082).

describe('chequesService.salidaSinFactura', () => {
  beforeEach(() => jest.clearAllMocks())

  it('manda el importe recibido y la cuenta cuando lo cambió en una cueva', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'ch-1', estado: 'ENDOSADO' }, error: null })

    const result = await chequesService.salidaSinFactura('ch-1', {
      destino: 'CAMBIO_EFECTIVO',
      fecha: '2026-09-17',
      notas: 'Cambiado en la cueva',
      importe_recibido: 200000,
      cuenta_recibido: 'efectivo',
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_salida_cheque_sin_factura', {
      p_cheque_id: 'ch-1',
      p_destino: 'CAMBIO_EFECTIVO',
      p_fecha: '2026-09-17',
      p_notas: 'Cambiado en la cueva',
      p_importe_recibido: 200000,
      p_cuenta_recibido: 'efectivo',
    })
  })

  it('no manda importe ni cuenta cuando el cheque se usó para algo personal', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'ch-1', estado: 'ENDOSADO' }, error: null })

    await chequesService.salidaSinFactura('ch-1', {
      destino: 'PERSONAL',
      fecha: '2026-09-17',
      notas: 'Lo usé para el colegio',
      cuenta_recibido: 'efectivo',
    })

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_salida_cheque_sin_factura',
      expect.objectContaining({
        p_destino: 'PERSONAL',
        p_importe_recibido: undefined,
        p_cuenta_recibido: undefined,
      })
    )
  })

  it('exige la nota: es el único dato que pidió Paola', async () => {
    const result = await chequesService.salidaSinFactura('ch-1', {
      destino: 'PERSONAL',
      fecha: '2026-09-17',
      notas: '  ',
      cuenta_recibido: 'efectivo',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('exige cuánto le dieron si lo cambió en una cueva', async () => {
    const result = await chequesService.salidaSinFactura('ch-1', {
      destino: 'CAMBIO_EFECTIVO',
      fecha: '2026-09-17',
      notas: 'Cambiado en la cueva',
      cuenta_recibido: 'efectivo',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.error).toMatch(/cuánto te dieron/i)
    }
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('retorna DB_ERROR si el cheque ya no está en cartera', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'El cheque no está en cartera (estado actual: DEPOSITADO)' },
    })

    const result = await chequesService.salidaSinFactura('ch-1', {
      destino: 'PERSONAL',
      fecha: '2026-09-17',
      notas: 'Lo usé para algo mío',
      cuenta_recibido: 'efectivo',
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

// ── fondosService.ajustarSaldo ───────────────────────────────
// La diferencia la calcula la DB contra v_saldo_fondos; el service
// solo valida y pasa el saldo real tal cual lo cargó Paola.

describe('fondosService.ajustarSaldo', () => {
  beforeEach(() => jest.clearAllMocks())

  const base = {
    cuenta: 'usd' as const,
    fecha: '2026-09-17',
    notas: 'no cargué el saldo inicial, hoy tengo US$ 800',
  }

  it('llama al RPC con el saldo real y la nota', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'm-9', tipo_movimiento: 'INGRESO', importe_usd: 750 }],
      error: null,
    })

    const result = await fondosService.ajustarSaldo({ ...base, saldo_real: 800 })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe('m-9')
    expect(mockRpc).toHaveBeenCalledWith('fn_ajustar_saldo_fondos', {
      p_cuenta: 'usd',
      p_saldo_real: 800,
      p_fecha: '2026-09-17',
      p_notas: 'no cargué el saldo inicial, hoy tengo US$ 800',
    })
  })

  it('acepta un saldo negativo — el banco está en descubierto', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'm-10' }], error: null })

    const result = await fondosService.ajustarSaldo({
      ...base,
      cuenta: 'banco',
      saldo_real: -4946410.5,
    })

    expect(result.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_ajustar_saldo_fondos',
      expect.objectContaining({ p_cuenta: 'banco', p_saldo_real: -4946410.5 })
    )
  })

  it('no llama al RPC si falta la nota', async () => {
    const result = await fondosService.ajustarSaldo({ ...base, saldo_real: 800, notas: '' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('devuelve DB_ERROR cuando el saldo ya era ese', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'El saldo de la cuenta ya es ese, no hay nada que ajustar' },
    })

    const result = await fondosService.ajustarSaldo({ ...base, saldo_real: 50 })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})
