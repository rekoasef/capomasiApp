import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TCheque } from '@/modules/cobranzas/types'

export type TEstadoCheque = TCheque['estado']

export const chequesService = {
  async getAll(opts?: { estado?: TEstadoCheque; origen?: TCheque['origen'] }): Promise<ServiceResult<TCheque[]>> {
    let query = supabase
      .from('cheques')
      .select('*')
      .order('fecha_cobro', { ascending: true })
    if (opts?.estado) query = query.eq('estado', opts.estado)
    if (opts?.origen) query = query.eq('origen', opts.origen)
    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TCheque[] }
  },

  async actualizarEstado(id: string, estado: TEstadoCheque, fecha_cobro?: string): Promise<ServiceResult<TCheque>> {
    const update: { estado: string; updated_at: string; fecha_cobro?: string } = {
      estado,
      updated_at: new Date().toISOString(),
    }
    if (fecha_cobro) update.fecha_cobro = fecha_cobro
    const { data, error } = await supabase
      .from('cheques')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCheque }
  },
}
