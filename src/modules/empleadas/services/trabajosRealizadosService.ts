import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import {
  aprobarTrabajoSchema,
  importarComisionesSchema,
  trabajoRealizadoSchema,
} from '../schemas/trabajoRealizadoSchema'
import type {
  TAprobarTrabajoForm,
  TImportarComisionesForm,
  TTrabajoRealizadoForm,
} from '../schemas/trabajoRealizadoSchema'
import type { TLiquidacionEmpleada, TTrabajoRealizado, TTrabajoRealizadoDetalle } from '../types'

export const trabajosRealizadosService = {
  async crear(form: unknown): Promise<ServiceResult<TTrabajoRealizado[]>> {
    const parsed = trabajoRealizadoSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { empleada_ids, ...rest } = parsed.data
    if (!empleada_ids?.length) {
      return { ok: false, error: 'Seleccioná al menos una empleada', code: 'VALIDATION_ERROR' }
    }

    const rows = empleada_ids.map((empleada_id) => mapTrabajoInsert({ ...rest, empleada_id }))
    const { data, error } = await supabase.from('trabajos_realizados').insert(rows).select()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TTrabajoRealizado[] }
  },

  async getByPeriodo(params: {
    periodo_mes: number
    periodo_anio: number
    empleada_id?: string
  }): Promise<ServiceResult<TTrabajoRealizadoDetalle[]>> {
    let query = supabase
      .from('trabajos_realizados')
      .select(
        `
        *,
        empleadas(nombre, tipo_comision),
        clientes(nombre),
        liquidaciones_empleadas(id, concepto, importe)
      `
      )
      .eq('periodo_mes', params.periodo_mes)
      .eq('periodo_anio', params.periodo_anio)

    if (params.empleada_id) {
      query = query.eq('empleada_id', params.empleada_id)
    }

    const { data, error } = await query
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TTrabajoRealizadoDetalle[] }
  },

  async aprobar(form: unknown): Promise<ServiceResult<TTrabajoRealizado>> {
    const parsed = aprobarTrabajoSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase.rpc('fn_aprobar_trabajo_realizado', {
      p_trabajo_id: parsed.data.trabajo_id,
      p_genera_comision: parsed.data.genera_comision,
      p_importe_comision: parsed.data.genera_comision
        ? (parsed.data.importe_comision ?? undefined)
        : undefined,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TTrabajoRealizado }
  },

  async importarComisiones(form: unknown): Promise<ServiceResult<TLiquidacionEmpleada[]>> {
    const parsed = importarComisionesSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase.rpc('fn_importar_comisiones_trabajos', {
      p_empleada_id: parsed.data.empleada_id,
      p_periodo_mes: parsed.data.periodo_mes,
      p_periodo_anio: parsed.data.periodo_anio,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TLiquidacionEmpleada[] }
  },

  async importarComisionIndividual(
    trabajoId: string
  ): Promise<ServiceResult<{ liquidacion_id: string | null }>> {
    const { data, error } = await supabase.rpc('fn_importar_comision_trabajo_individual', {
      p_trabajo_id: trabajoId,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    const row = Array.isArray(data) ? data[0] : data
    return { ok: true, data: { liquidacion_id: row?.liquidacion_id ?? null } }
  },
}

function mapTrabajoInsert(
  data: Omit<TTrabajoRealizadoForm, 'empleada_ids'> & { empleada_id: string }
) {
  const fecha = new Date(`${data.fecha}T00:00:00`)
  return {
    empleada_id: data.empleada_id,
    fecha: data.fecha,
    cliente_id: data.cliente_id || null,
    tipo_trabajo: data.tipo_trabajo,
    descripcion: data.descripcion.trim(),
    periodo_mes: fecha.getUTCMonth() + 1,
    periodo_anio: fecha.getUTCFullYear(),
  }
}

export type { TAprobarTrabajoForm, TImportarComisionesForm, TTrabajoRealizadoForm }
