import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import { pagoGastoSchema } from '../schemas/pagoGastoSchema'
import type { TPagoGastoForm } from '../schemas/pagoGastoSchema'
import type {
  TPagoGasto,
  TPagoGastoDetalle,
  TPagosGastosFilters,
  TResumenAnualGastos,
  TResumenCategoria,
  TResumenGasto,
  TResumenMensualGasto,
} from '../types'
import { getMonthRange } from '../utils/fechas'

function normalizeFilters(filters?: TPagosGastosFilters): { desde?: string; hasta?: string } {
  if (!filters) return {}
  if (filters.anio && filters.mes) return getMonthRange(filters.anio, filters.mes)
  if (filters.anio) return { desde: `${filters.anio}-01-01`, hasta: `${filters.anio}-12-31` }
  return { desde: filters.desde, hasta: filters.hasta }
}

function buildResumen(anio: number, pagos: TPagoGastoDetalle[]): TResumenAnualGastos {
  const categorias = new Map<string, TResumenCategoria>()
  const gastos = new Map<string, TResumenGasto>()
  const mensual = new Map<string, TResumenMensualGasto>()
  let total = 0

  for (const pago of pagos) {
    const importe = Number(pago.importe)
    total += importe

    const categoria = categorias.get(pago.categoria_id) ?? {
      categoria_id: pago.categoria_id,
      categoria_nombre: pago.categoria_nombre,
      categoria_color: pago.categoria_color,
      total: 0,
      cantidad: 0,
    }
    categoria.total += importe
    categoria.cantidad += 1
    categorias.set(pago.categoria_id, categoria)

    const gastoKey = pago.gasto_recurrente_id ?? `unico:${pago.concepto}`
    const gasto = gastos.get(gastoKey) ?? {
      gasto_recurrente_id: pago.gasto_recurrente_id,
      gasto_descripcion: pago.gasto_descripcion ?? pago.concepto,
      categoria_id: pago.categoria_id,
      categoria_nombre: pago.categoria_nombre,
      total: 0,
      cantidad: 0,
    }
    gasto.total += importe
    gasto.cantidad += 1
    gastos.set(gastoKey, gasto)

    const mensualKey = `${gastoKey}:${pago.mes}`
    const mensualGasto = mensual.get(mensualKey) ?? {
      gasto_recurrente_id: pago.gasto_recurrente_id,
      gasto_descripcion: pago.gasto_descripcion ?? pago.concepto,
      mes: pago.mes,
      total: 0,
      cantidad: 0,
    }
    mensualGasto.total += importe
    mensualGasto.cantidad += 1
    mensual.set(mensualKey, mensualGasto)
  }

  return {
    anio,
    total,
    porCategoria: Array.from(categorias.values()).sort((a, b) => b.total - a.total),
    porGasto: Array.from(gastos.values()).sort((a, b) => b.total - a.total),
    mensualPorGasto: Array.from(mensual.values()).sort(
      (a, b) => a.mes - b.mes || b.total - a.total
    ),
  }
}

export const pagosGastosService = {
  async getHistorial(filters?: TPagosGastosFilters): Promise<ServiceResult<TPagoGastoDetalle[]>> {
    const range = normalizeFilters(filters)
    let query = supabase.from('v_pagos_gastos_detalle').select('*')

    if (range.desde) query = query.gte('fecha_pago', range.desde)
    if (range.hasta) query = query.lte('fecha_pago', range.hasta)
    if (filters?.categoriaId) query = query.eq('categoria_id', filters.categoriaId)
    if (filters?.gastoRecurrenteId)
      query = query.eq('gasto_recurrente_id', filters.gastoRecurrenteId)
    if (filters?.ambito) query = query.eq('categoria_ambito', filters.ambito)

    const { data, error } = await query.order('fecha_pago', { ascending: false })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TPagoGastoDetalle[] }
  },

  // Versión paginada de getHistorial, para la tabla de la UI. getHistorial (sin
  // paginar) se sigue usando para el resumen/gráfico, que necesitan el total real.
  async getHistorialPaginado(
    filters?: TPagosGastosFilters & { page?: number; pageSize?: number }
  ): Promise<ServiceResult<{ rows: TPagoGastoDetalle[]; total: number }>> {
    const pageSize = filters?.pageSize ?? 25
    const page = filters?.page ?? 0
    const from = page * pageSize
    const to = from + pageSize - 1

    const range = normalizeFilters(filters)
    let query = supabase.from('v_pagos_gastos_detalle').select('*', { count: 'exact' })

    if (range.desde) query = query.gte('fecha_pago', range.desde)
    if (range.hasta) query = query.lte('fecha_pago', range.hasta)
    if (filters?.categoriaId) query = query.eq('categoria_id', filters.categoriaId)
    if (filters?.gastoRecurrenteId)
      query = query.eq('gasto_recurrente_id', filters.gastoRecurrenteId)
    if (filters?.ambito) query = query.eq('categoria_ambito', filters.ambito)

    const { data, error, count } = await query
      .order('fecha_pago', { ascending: false })
      .range(from, to)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: { rows: (data ?? []) as TPagoGastoDetalle[], total: count ?? 0 } }
  },

  async registrar(form: TPagoGastoForm): Promise<ServiceResult<TPagoGasto>> {
    const parsed = pagoGastoSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const { data, error } = await supabase.rpc('fn_registrar_pago_gasto', {
      p_categoria_id: parsed.data.categoria_id,
      p_concepto: parsed.data.concepto,
      p_fecha_pago: parsed.data.fecha_pago,
      p_medio_pago: parsed.data.medio_pago,
      p_importe: parsed.data.importe,
      p_gasto_recurrente_id: parsed.data.gasto_recurrente_id ?? undefined,
      p_comprobante_url: parsed.data.comprobante_url ?? undefined,
      p_notas: parsed.data.notas ?? undefined,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TPagoGasto }
  },

  async update(id: string, form: TPagoGastoForm): Promise<ServiceResult<TPagoGasto>> {
    const parsed = pagoGastoSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const { data, error } = await supabase
      .from('pagos_gastos')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TPagoGasto }
  },

  async eliminar(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.rpc('fn_eliminar_pago_gasto', { p_pago_id: id })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: null }
  },

  async getResumenAnual(
    anio: number,
    filters?: Omit<TPagosGastosFilters, 'anio' | 'mes'>
  ): Promise<ServiceResult<TResumenAnualGastos>> {
    const result = await pagosGastosService.getHistorial({ ...filters, anio })
    if (!result.ok) return { ok: false, error: result.error, code: result.code }
    return { ok: true, data: buildResumen(anio, result.data) }
  },

  async getResumenPorCategoria(anio: number): Promise<ServiceResult<TResumenCategoria[]>> {
    const result = await pagosGastosService.getResumenAnual(anio)
    if (!result.ok) return { ok: false, error: result.error, code: result.code }
    return { ok: true, data: result.data.porCategoria }
  },
}
