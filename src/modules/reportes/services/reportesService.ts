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

// Los reportes por mes, tipo y empleada leen las vistas *_con_historico,
// que unen las liquidaciones reales (desde sep-2026) con la facturación
// migrada del Excel (oct-2025 a ago-2026). El corte por fecha es limpio,
// así que no hay doble conteo. Ver migración 0077.
//
// El Dashboard sigue leyendo v_resultado_mensual, que usa las vistas sin
// histórico: no migramos gastos históricos, y mezclar ingresos viejos con
// gastos nuevos daría una ganancia falsa en esos meses.
export const reportesService = {
  async getIngresosMensuales(
    anio?: number,
    mes?: number
  ): Promise<ServiceResult<TIngresoMensual[]>> {
    let query = supabase
      .from('v_ingresos_mensuales_con_historico')
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
    const { data, error } = await supabase.from('v_ingresos_mensuales_con_historico').select('mes')
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
      .from('v_ingresos_por_tipo_mes_con_historico')
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
      .from('v_ingresos_por_empleada_mes_con_historico')
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

  // El comparativo entre períodos también suma la facturación migrada del
  // Excel (pedido de Paola, 2026-09-10: "lo histórico no me lo compara" —
  // le daba $7M para un período que arrancaba en nov-2025).
  //
  // No usa las vistas *_con_historico porque esas agrupan por mes y acá los
  // períodos son fechas sueltas (ella comparó hasta el 10/09). Va a las
  // filas, con el mismo corte limpio de la 0077 — histórica hasta ago-2026,
  // liquidaciones desde sep-2026 — y la misma exclusión de los SALDO
  // INICIAL, que ya viene resuelta en v_facturacion_historica_normalizada.
  async getComparativoPeriodos(
    periodoA: { desde: string; hasta: string },
    periodoB: { desde: string; hasta: string }
  ): Promise<ServiceResult<TComparativoResultado>> {
    const fetchRango = async (desde: string, hasta: string) => {
      const [reales, historicas] = await Promise.all([
        supabase
          .from('liquidaciones')
          .select('importe_liquidado, importe_facturado')
          .eq('tipo_liquidacion', 'NORMAL')
          .neq('estado', 'ANULADA')
          .gte('fecha_liquidacion', desde)
          .lte('fecha_liquidacion', hasta),
        supabase
          .from('v_facturacion_historica_normalizada')
          .select('importe_liquidado, importe_facturado')
          .gte('fecha_liquidacion', desde)
          .lte('fecha_liquidacion', hasta),
      ])

      if (reales.error) throw new Error(reales.error.message)
      if (historicas.error) throw new Error(historicas.error.message)

      return sumarIngresos([
        ...(reales.data ?? []),
        ...(historicas.data ?? []).map((r) => ({
          importe_liquidado: r.importe_liquidado ?? 0,
          importe_facturado: r.importe_facturado,
        })),
      ])
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
