import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import { gastoRecurrenteSchema } from '../schemas/gastoRecurrenteSchema'
import type { TGastoRecurrenteForm } from '../schemas/gastoRecurrenteSchema'
import type { TGastoRecurrente, TProximoVencimiento } from '../types'

export const gastosRecurrentesService = {
  async getAll(opts?: {
    includeInactive?: boolean
    categoriaId?: string
  }): Promise<ServiceResult<TGastoRecurrente[]>> {
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
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    // proxima_fecha_vencimiento la calcula la DB (trigger
    // trg_gastos_recurrentes_proxima_fecha). Mandarla desde acá duplicaba la regla.
    const { data, error } = await supabase
      .from('gastos_recurrentes')
      .insert(parsed.data)
      .select('*, categorias_gastos(nombre, color, activo)')
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TGastoRecurrente }
  },

  async update(
    id: string,
    form: Partial<TGastoRecurrenteForm>
  ): Promise<ServiceResult<TGastoRecurrente>> {
    const parsed = gastoRecurrenteSchema.partial().safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    // Nunca mandar proxima_fecha_vencimiento: el trigger la recalcula solo cuando
    // cambia dia_vencimiento. Pisarla en cada edición devolvía a "pendiente" un
    // gasto ya pagado (reporte de Paola, 2026-09-10).
    const { data, error } = await supabase
      .from('gastos_recurrentes')
      .update(parsed.data)
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
