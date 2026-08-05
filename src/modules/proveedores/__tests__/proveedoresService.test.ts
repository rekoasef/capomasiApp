import { proveedoresService } from '../services/proveedoresService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
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
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const COMPRA_UUID = 'a1b2c3d4-58cc-4372-a567-0e02b2c3d479'

// ── getAll ───────────────────────────────────────────────────

describe('proveedoresService.getAll', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna lista de proveedores activos', async () => {
    const proveedores = [{ id: UUID, nombre: 'Proveedor SA', activo: true }]
    mockChain({ order: jest.fn().mockResolvedValue({ data: proveedores, error: null }) })

    const result = await proveedoresService.getAll()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('retorna DB_ERROR si falla', async () => {
    mockChain({
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await proveedoresService.getAll()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── create ───────────────────────────────────────────────────

describe('proveedoresService.create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el nombre está vacío', async () => {
    const result = await proveedoresService.create({ nombre: '', activo: true })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea el proveedor correctamente', async () => {
    const prov = { id: UUID, nombre: 'Proveedor SA', activo: true }
    mockChain({ single: jest.fn().mockResolvedValue({ data: prov, error: null }) })

    const result = await proveedoresService.create({ nombre: 'Proveedor SA', activo: true })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.nombre).toBe('Proveedor SA')
  })
})

// ── crearCompra ──────────────────────────────────────────────

describe('proveedoresService.crearCompra', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el concepto está vacío', async () => {
    const result = await proveedoresService.crearCompra({
      proveedor_id: UUID,
      fecha: '2026-04-21',
      concepto: '',
      importe_total: 5000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el importe es 0', async () => {
    const result = await proveedoresService.crearCompra({
      proveedor_id: UUID,
      fecha: '2026-04-21',
      concepto: 'Compra test',
      importe_total: 0,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea la compra correctamente', async () => {
    const compra = {
      id: 'c-1',
      proveedor_id: UUID,
      concepto: 'Compra test',
      importe_total: 5000,
      estado: 'PENDIENTE',
    }
    mockChain({ single: jest.fn().mockResolvedValue({ data: compra, error: null }) })

    const result = await proveedoresService.crearCompra({
      proveedor_id: UUID,
      fecha: '2026-04-21',
      concepto: 'Compra test',
      importe_total: 5000,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('PENDIENTE')
  })
})

// ── anularCompra ─────────────────────────────────────────────

describe('proveedoresService.anularCompra', () => {
  beforeEach(() => jest.clearAllMocks())

  it('anula la compra', async () => {
    const chain = mockChain()
    chain.eq = jest.fn().mockResolvedValue({ error: null })

    const result = await proveedoresService.anularCompra('c-1')
    expect(result.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ estado: 'ANULADA' })
  })
})

// ── registrarPago ────────────────────────────────────────────

describe('proveedoresService.registrarPago', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el importe es 0', async () => {
    const result = await proveedoresService.registrarPago({
      compra_id: UUID,
      tipo_pago: 'TRANSFERENCIA',
      importe: 0,
      fecha_pago: '2026-04-21',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('llama al RPC y retorna el pago', async () => {
    const pago = { id: 'p-1', compra_id: UUID, importe: 5000, tipo_pago: 'TRANSFERENCIA' }
    mockRpc.mockResolvedValue({ data: pago, error: null })

    const result = await proveedoresService.registrarPago({
      compra_id: UUID,
      tipo_pago: 'TRANSFERENCIA',
      importe: 5000,
      fecha_pago: '2026-04-21',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.importe).toBe(5000)
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_pago_proveedor',
      expect.objectContaining({
        p_compra_id: UUID,
        p_importe: 5000,
      })
    )
  })

  it('retorna DB_ERROR si el RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })

    const result = await proveedoresService.registrarPago({
      compra_id: UUID,
      tipo_pago: 'EFECTIVO',
      importe: 1000,
      fecha_pago: '2026-04-21',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── crearGastoPagado ─────────────────────────────────────────

describe('proveedoresService.crearGastoPagado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el concepto está vacío', async () => {
    const result = await proveedoresService.crearGastoPagado({
      proveedor_id: UUID,
      fecha: '2026-04-21',
      concepto: '',
      importe_total: 5000,
      tipo_pago: 'EFECTIVO',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea la compra ya pagada en un solo paso (compra + RPC de pago)', async () => {
    const compra = {
      id: COMPRA_UUID,
      proveedor_id: UUID,
      concepto: 'Gasto test',
      importe_total: 5000,
      estado: 'PENDIENTE',
    }
    const pago = { id: 'p-1', compra_id: COMPRA_UUID, importe: 5000, tipo_pago: 'EFECTIVO' }
    mockChain({ single: jest.fn().mockResolvedValue({ data: compra, error: null }) })
    mockRpc.mockResolvedValue({ data: pago, error: null })

    const result = await proveedoresService.crearGastoPagado({
      proveedor_id: UUID,
      fecha: '2026-04-21',
      concepto: 'Gasto test',
      importe_total: 5000,
      tipo_pago: 'EFECTIVO',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.estado).toBe('PAGADA')
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_registrar_pago_proveedor',
      expect.objectContaining({
        p_compra_id: COMPRA_UUID,
        p_importe: 5000,
      })
    )
  })

  it('no llama al RPC de pago si la creación de la compra falla', async () => {
    mockChain({
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
    })

    const result = await proveedoresService.crearGastoPagado({
      proveedor_id: UUID,
      fecha: '2026-04-21',
      concepto: 'Gasto test',
      importe_total: 5000,
      tipo_pago: 'EFECTIVO',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
