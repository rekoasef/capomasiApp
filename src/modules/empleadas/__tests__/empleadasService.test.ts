import { empleadaSchema } from '../schemas/empleadaSchema'
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
    const result = await empleadasService.create({
      nombre: 'Victoria',
      // @ts-expect-error — testeamos runtime con valor inválido
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

// ── actualizarPago / eliminarPago ────────────────────────────

const pagoValido = {
  empleada_id: UUID,
  periodo_mes: 9,
  periodo_anio: 2026,
  tipo_pago: 'TRANSFERENCIA' as const,
  importe: 1428333,
  fecha_pago: '2026-09-11',
}

describe('empleadasService.actualizarPago', () => {
  beforeEach(() => jest.clearAllMocks())

  it('corrige el importe de un pago mal cargado', async () => {
    const chain = mockChain({
      single: jest.fn().mockResolvedValue({
        data: { ...pagoValido, id: 'p-1', importe: 1283128 },
        error: null,
      }),
    })

    const result = await empleadasService.actualizarPago('p-1', {
      ...pagoValido,
      importe: 1283128,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.importe).toBe(1283128)
    expect(chain.eq).toHaveBeenCalledWith('id', 'p-1')
  })

  it('retorna VALIDATION_ERROR si el importe es cero', async () => {
    const result = await empleadasService.actualizarPago('p-1', { ...pagoValido, importe: 0 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna VALIDATION_ERROR si el tipo de pago no existe', async () => {
    const result = await empleadasService.actualizarPago('p-1', {
      ...pagoValido,
      tipo_pago: 'CRIPTO' as unknown as 'TRANSFERENCIA',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('retorna DB_ERROR si falla la query', async () => {
    mockChain({
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const result = await empleadasService.actualizarPago('p-1', pagoValido)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
  })
})

describe('empleadasService.eliminarPago', () => {
  beforeEach(() => jest.clearAllMocks())

  it('elimina el pago por id', async () => {
    const chain = mockChain({ eq: jest.fn().mockResolvedValue({ error: null }) })

    const result = await empleadasService.eliminarPago('p-1')

    expect(result.ok).toBe(true)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'p-1')
  })

  it('retorna DB_ERROR si falla la query', async () => {
    mockChain({ eq: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }) })

    const result = await empleadasService.eliminarPago('p-1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('DB_ERROR')
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

// ── sueldo fijo / valor hora opcionales ──────────────────────
//
// Paola pasó a Agustina de sueldo fijo a por hora y no pudo vaciar el campo
// viejo: escribir 0 rebotaba con "Debe ser mayor a 0", y borrarlo lo mandaba
// como undefined, que Supabase descarta del update — la columna se quedaba
// con el valor anterior sin avisar. Las dos formas tienen que dar null.

describe('empleadaSchema — vaciar sueldo_fijo y valor_hora', () => {
  const base = {
    nombre: 'Agustina',
    tipo_relacion: 'POR_HORA' as const,
    tipo_comision: 'NINGUNA' as const,
    activo: true,
  }

  it('acepta el 0 y lo guarda como null', () => {
    const r = empleadaSchema.safeParse({ ...base, sueldo_fijo: 0, valor_hora: 8327 })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.sueldo_fijo).toBeNull()
      expect(r.data.valor_hora).toBe(8327)
    }
  })

  it('convierte el campo vacío en null, no en undefined', () => {
    const r = empleadaSchema.safeParse({ ...base, sueldo_fijo: '', valor_hora: '' })
    expect(r.success).toBe(true)
    if (r.success) {
      // null y no undefined: undefined desaparece del payload del update.
      expect(r.data.sueldo_fijo).toBeNull()
      expect(r.data.valor_hora).toBeNull()
      expect('sueldo_fijo' in r.data).toBe(true)
    }
  })

  it('sigue rechazando los importes negativos', () => {
    const r = empleadaSchema.safeParse({ ...base, valor_hora: -100 })
    expect(r.success).toBe(false)
  })

  it('deja pasar el string que llega del input number', () => {
    const r = empleadaSchema.safeParse({ ...base, valor_hora: '8327' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.valor_hora).toBe(8327)
  })
})
