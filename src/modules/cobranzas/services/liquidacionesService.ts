import { supabase } from '@/lib/supabase/client'
import { liquidacionSchema } from '../schemas/liquidacionSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TLiquidacion, TLiquidacionConImputaciones } from '../types'

export const liquidacionesService = {
  async getByCliente(clienteId: string): Promise<ServiceResult<TLiquidacionConImputaciones[]>> {
    const { data, error } = await supabase
      .from('liquidaciones')
      .select('*, imputaciones(*)')
      .eq('cliente_id', clienteId)
      .order('fecha_liquidacion', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TLiquidacionConImputaciones[] }
  },

  async getPendientesByCliente(clienteId: string): Promise<ServiceResult<TLiquidacion[]>> {
    const { data, error } = await supabase
      .from('liquidaciones')
      .select('*')
      .eq('cliente_id', clienteId)
      .in('estado', ['PENDIENTE', 'PARCIALMENTE_COBRADA'])
      .order('fecha_liquidacion', { ascending: true })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TLiquidacion[] }
  },

  async getPendientes(): Promise<ServiceResult<TLiquidacion[]>> {
    const { data, error } = await supabase
      .from('liquidaciones')
      .select('*')
      .in('estado', ['PENDIENTE', 'PARCIALMENTE_COBRADA'])
      .order('fecha_liquidacion', { ascending: true })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TLiquidacion[] }
  },

  async getUltimaByCliente(
    clienteId: string,
    tipoServicio?: string,
  ): Promise<ServiceResult<TLiquidacion | null>> {
    let query = supabase
      .from('liquidaciones')
      .select('*')
      .eq('cliente_id', clienteId)
      .neq('estado', 'ANULADA')
      .order('fecha_liquidacion', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (tipoServicio) {
      query = query.eq('tipo_servicio', tipoServicio)
    }

    const { data, error } = await query.maybeSingle()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data as TLiquidacion) ?? null }
  },

  async create(form: unknown): Promise<ServiceResult<TLiquidacion>> {
    const parsed = liquidacionSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('liquidaciones')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TLiquidacion }
  },

  async anular(id: string): Promise<ServiceResult<TLiquidacion>> {
    const { data, error } = await supabase
      .from('liquidaciones')
      .update({ estado: 'ANULADA', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TLiquidacion }
  },
}
