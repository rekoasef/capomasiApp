import { empleadasService } from '../services/empleadasService'

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}))

import { supabase } from '@/lib/supabase/client'

const mockFrom = supabase.from as jest.Mock

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
    maybeSingle: jest.fn().mockReturnThis(),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// ── getAll ───────────────────────────────────────────────────

describe('empleadasService.getAll', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna lista de empleadas activas', async () => {
    const empleadas = [{ id: UUID, nombre: 'Victoria', tipo_relacion: 'DEPENDENCIA', activo: true }]
    mockChain({ order: jest.fn().mockResolvedValue({ data: empleadas, error: null }) })

    const result = await empleadasService.getAll()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('retorna DB_ERROR si falla la query', async () => {
    mockChain({
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await empleadasService.getAll()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── create ───────────────────────────────────────────────────

describe('empleadasService.create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el nombre es muy corto', async () => {
    const result = await empleadasService.create({
      nombre: 'A',
      tipo_relacion: 'DEPENDENCIA',
      tipo_comision: 'NINGUNA',
      activo: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el tipo_relacion es inválido', async () => {
    // @ts-expect-error — testeamos runtime con valor inválido
    const result = await empleadasService.create({
      nombre: 'Victoria',
      tipo_relacion: 'FREELANCE',
      activo: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea la empleada correctamente', async () => {
    const empleada = { id: UUID, nombre: 'Victoria', tipo_relacion: 'DEPENDENCIA', activo: true }
    mockChain({ single: jest.fn().mockResolvedValue({ data: empleada, error: null }) })

    const result = await empleadasService.create({
      nombre: 'Victoria',
      tipo_relacion: 'DEPENDENCIA',
      tipo_comision: 'NINGUNA',
      activo: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.nombre).toBe('Victoria')
  })
})

// ── softDelete ───────────────────────────────────────────────

describe('empleadasService.softDelete', () => {
  beforeEach(() => jest.clearAllMocks())

  it('marca deleted_at y no elimina la fila', async () => {
    const chain = mockChain()
    chain.eq = jest.fn().mockResolvedValue({ error: null })

    const result = await empleadasService.softDelete(UUID)
    expect(result.ok).toBe(true)
    // Verifica que se usó update (no delete)
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    )
  })

  it('retorna DB_ERROR si falla', async () => {
    const chain = mockChain()
    chain.eq = jest.fn().mockResolvedValue({ error: { message: 'DB error' } })

    const result = await empleadasService.softDelete(UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

// ── crearLiquidacion ─────────────────────────────────────────

describe('empleadasService.crearLiquidacion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna VALIDATION_ERROR si el concepto está vacío', async () => {
    const result = await empleadasService.crearLiquidacion({
      empleada_id: UUID,
      concepto: '',
      tipo_concepto: 'HABER',
      periodo_mes: 4,
      periodo_anio: 2026,
      importe: 100000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el importe es negativo', async () => {
    const result = await empleadasService.crearLiquidacion({
      empleada_id: UUID,
      concepto: 'Sueldo fijo',
      tipo_concepto: 'HABER',
      periodo_mes: 4,
      periodo_anio: 2026,
      importe: -100,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('crea el concepto correctamente', async () => {
    const liq = {
      id: 'l-1',
      empleada_id: UUID,
      concepto: 'Sueldo fijo',
      tipo_concepto: 'HABER',
      importe: 100000,
    }
    mockChain({ single: jest.fn().mockResolvedValue({ data: liq, error: null }) })

    const result = await empleadasService.crearLiquidacion({
      empleada_id: UUID,
      concepto: 'Sueldo fijo',
      tipo_concepto: 'HABER',
      periodo_mes: 4,
      periodo_anio: 2026,
      importe: 100000,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.concepto).toBe('Sueldo fijo')
  })
})

// ── getResumenPeriodo ────────────────────────────────────────

describe('empleadasService.getResumenPeriodo', () => {
  beforeEach(() => jest.clearAllMocks())

  // El resumen ya no filtra por período en la query: trae todo el historial
  // porque el arrastre necesita saber qué quedó de los meses anteriores.
  function mockResumenChain(empData: unknown, liqData: unknown, pagosData: unknown) {
    mockFrom
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: empData, error: null }),
      })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ data: liqData, error: null }) })
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: pagosData, error: null }),
      })
  }

  const liq = (mes: number, tipo: string, importe: number) => ({
    empleada_id: UUID,
    periodo_anio: 2026,
    periodo_mes: mes,
    tipo_concepto: tipo,
    importe,
  })
  const pago = (mes: number, importe: number) => ({
    empleada_id: UUID,
    periodo_anio: 2026,
    periodo_mes: mes,
    importe,
  })

  it('calcula neto = haberes - descuentos', async () => {
    mockResumenChain(
      [{ id: UUID, nombre: 'Victoria' }],
      [liq(4, 'HABER', 200000), liq(4, 'DESCUENTO', 15000)],
      []
    )

    const result = await empleadasService.getResumenPeriodo(2026, 4)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const r = result.data[0]
      expect(r.total_haberes).toBe(200000)
      expect(r.total_descuentos).toBe(15000)
      expect(r.neto).toBe(185000)
      expect(r.saldo).toBe(185000)
    }
  })

  it('calcula saldo = neto - total_pagado', async () => {
    mockResumenChain(
      [{ id: UUID, nombre: 'Victoria' }],
      [liq(4, 'HABER', 100000)],
      [pago(4, 60000)]
    )

    const result = await empleadasService.getResumenPeriodo(2026, 4)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0].neto).toBe(100000)
      expect(result.data[0].total_pagado).toBe(60000)
      expect(result.data[0].saldo_anterior).toBe(0)
      expect(result.data[0].saldo).toBe(40000)
    }
  })

  it('ignora los períodos que no son el pedido, pero los arrastra', async () => {
    mockResumenChain(
      [{ id: UUID, nombre: 'Victoria' }],
      [liq(3, 'HABER', 100000), liq(4, 'HABER', 100000)],
      [pago(3, 130000)]
    )

    const result = await empleadasService.getResumenPeriodo(2026, 4)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const r = result.data[0]
      expect(r.total_haberes).toBe(100000)
      expect(r.total_pagado).toBe(0)
      expect(r.saldo_anterior).toBe(-30000)
      expect(r.saldo).toBe(70000)
    }
  })
})
