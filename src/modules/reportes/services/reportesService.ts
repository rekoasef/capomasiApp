import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type {
  TIngresoMensual,
  TResumenTipo,
  TResumenEmpleada,
  TComparativoResultado,
} from '../types'
import { sumarIngresos } from './sumarIngresos'

function rangoAnio(anio: number, mes?: number) {
  if (mes) {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(anio, mes, 0).getDate()
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    return { desde, hasta }
  }
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` }
}

export const reportesService = {
  async getIngresosMensuales(
    anio?: number,
    mes?: number
  ): Promise<ServiceResult<TIngresoMensual[]>> {
    let query = supabase
      .from('v_ingresos_mensuales')
      .select('mes, cantidad_liquidaciones, total_liquidado, total_facturado')
      .order('mes', { ascending: true })

    if (anio) {
      const { desde, hasta } = rangoAnio(anio, mes)
      query = query.gte('mes', desde).lte('mes', hasta)
    }

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }

    return {
      ok: true,
      data: (data ?? []).map((r) => ({
        mes: r.mes ?? '',
        cantidad_liquidaciones: r.cantidad_liquidaciones ?? 0,
        total_liquidado: r.total_liquidado ?? 0,
        total_facturado: r.total_facturado ?? 0,
      })),
    }
  },

  async getAniosDisponibles(): Promise<ServiceResult<number[]>> {
    const { data, error } = await supabase.from('v_ingresos_mensuales').select('mes')
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }

    const anios = new Set(
      (data ?? []).map((r) => Number((r.mes ?? '').slice(0, 4))).filter(Boolean)
    )
    const anioActual = new Date().getFullYear()
    anios.add(anioActual)

    return { ok: true, data: Array.from(anios).sort((a, b) => b - a) }
  },

  async getIngresosPorTipo(anio?: number, mes?: number): Promise<ServiceResult<TResumenTipo[]>> {
    let query = supabase
      .from('v_ingresos_por_tipo_mes')
      .select('mes, tipo_servicio, cantidad, total_liquidado, total_facturado')

    if (anio) {
      const { desde, hasta } = rangoAnio(anio, mes)
      query = query.gte('mes', desde).lte('mes', hasta)
    }

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }

    const porTipo = new Map<string, TResumenTipo>()
    for (const r of data ?? []) {
      const key = r.tipo_servicio ?? 'OTROS'
      const acc = porTipo.get(key) ?? {
        tipo_servicio: key,
        cantidad: 0,
        total_liquidado: 0,
        total_facturado: 0,
      }
      acc.cantidad += r.cantidad ?? 0
      acc.total_liquidado += r.total_liquidado ?? 0
      acc.total_facturado += r.total_facturado ?? 0
      porTipo.set(key, acc)
    }

    return {
      ok: true,
      data: Array.from(porTipo.values()).sort((a, b) => b.total_liquidado - a.total_liquidado),
    }
  },

  async getIngresosPorEmpleada(
    anio?: number,
    mes?: number
  ): Promise<ServiceResult<TResumenEmpleada[]>> {
    let query = supabase
      .from('v_ingresos_por_empleada_mes')
      .select('mes, empleada, cantidad, total_liquidado')

    if (anio) {
      const { desde, hasta } = rangoAnio(anio, mes)
      query = query.gte('mes', desde).lte('mes', hasta)
    }

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }

    const porEmpleada = new Map<string, TResumenEmpleada>()
    for (const r of data ?? []) {
      const key = r.empleada ?? 'Sin asignar'
      const acc = porEmpleada.get(key) ?? { empleada: key, cantidad: 0, total_liquidado: 0 }
      acc.cantidad += r.cantidad ?? 0
      acc.total_liquidado += r.total_liquidado ?? 0
      porEmpleada.set(key, acc)
    }

    return {
      ok: true,
      data: Array.from(porEmpleada.values()).sort((a, b) => b.total_liquidado - a.total_liquidado),
    }
  },

  async getComparativoPeriodos(
    periodoA: { desde: string; hasta: string },
    periodoB: { desde: string; hasta: string }
  ): Promise<ServiceResult<TComparativoResultado>> {
    const fetchRango = async (desde: string, hasta: string) => {
      const { data, error } = await supabase
        .from('liquidaciones')
        .select('importe_liquidado, importe_facturado')
        .eq('tipo_liquidacion', 'NORMAL')
        .neq('estado', 'ANULADA')
        .gte('fecha_liquidacion', desde)
        .lte('fecha_liquidacion', hasta)

      if (error) throw new Error(error.message)
      return sumarIngresos(data ?? [])
    }

    try {
      const [resA, resB] = await Promise.all([
        fetchRango(periodoA.desde, periodoA.hasta),
        fetchRango(periodoB.desde, periodoB.hasta),
      ])

      return {
        ok: true,
        data: {
          periodoA: { ...periodoA, ...resA },
          periodoB: { ...periodoB, ...resB },
        },
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Error desconocido',
        code: 'DB_ERROR',
      }
    }
  },
}
