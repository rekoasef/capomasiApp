import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import { gastoRecurrenteSchema } from '../schemas/gastoRecurrenteSchema'
import type { TGastoRecurrenteForm } from '../schemas/gastoRecurrenteSchema'
import type { TGastoRecurrente, TProximoVencimiento } from '../types'
import { calcularProximaFechaVencimiento } from '../utils/fechas'

export const gastosRecurrentesService = {
  async getAll(opts?: { includeInactive?: boolean; categoriaId?: string }): Promise<ServiceResult<TGastoRecurrente[]>> {
    let query = supabase
      .from('gastos_recurrentes')
      .select('*, categorias_gastos(nombre, color, activo)')
      .order('proxima_fecha_vencimiento')

    if (!opts?.includeInactive) query = query.eq('activo', true)
    if (opts?.categoriaId) query = query.eq('categoria_id', opts.categoriaId)

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TGastoRecurrente[] }
  },

  async getProximos(dias?: number): Promise<ServiceResult<TProximoVencimiento[]>> {
    let query = supabase
      .from('v_proximos_vencimientos')
      .select('*')
      .order('proxima_fecha_vencimiento')

    if (dias != null) {
      const hasta = new Date()
      hasta.setDate(hasta.getDate() + dias)
      query = query.lte('proxima_fecha_vencimiento', hasta.toISOString().split('T')[0])
    }

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TProximoVencimiento[] }
  },

  async create(form: TGastoRecurrenteForm): Promise<ServiceResult<TGastoRecurrente>> {
    const parsed = gastoRecurrenteSchema.safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const payload = {
      ...parsed.data,
      proxima_fecha_vencimiento: calcularProximaFechaVencimiento(parsed.data.dia_vencimiento),
    }

    const { data, error } = await supabase
      .from('gastos_recurrentes')
      .insert(payload)
      .select('*, categorias_gastos(nombre, color, activo)')
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TGastoRecurrente }
  },

  async update(id: string, form: Partial<TGastoRecurrenteForm>): Promise<ServiceResult<TGastoRecurrente>> {
    const parsed = gastoRecurrenteSchema.partial().safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const payload = {
      ...parsed.data,
      ...(parsed.data.dia_vencimiento
        ? { proxima_fecha_vencimiento: calcularProximaFechaVencimiento(parsed.data.dia_vencimiento) }
        : {}),
    }

    const { data, error } = await supabase
      .from('gastos_recurrentes')
      .update(payload)
      .eq('id', id)
      .select('*, categorias_gastos(nombre, color, activo)')
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TGastoRecurrente }
  },

  async toggleActivo(id: string, activo: boolean): Promise<ServiceResult<TGastoRecurrente>> {
    return gastosRecurrentesService.update(id, { activo })
  },
}
