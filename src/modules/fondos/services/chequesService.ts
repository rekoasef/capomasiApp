import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TCheque } from '@/modules/cobranzas/types'

export type TEstadoCheque = TCheque['estado']

export const chequesService = {
  async getAll(opts?: {
    estado?: TEstadoCheque
    origen?: TCheque['origen']
    page?: number
    pageSize?: number
  }): Promise<ServiceResult<{ rows: TCheque[]; total: number }>> {
    const pageSize = opts?.pageSize ?? 25
    const page = opts?.page ?? 0
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('cheques')
      .select('*', { count: 'exact' })
      .order('fecha_cobro', { ascending: true })
      .range(from, to)
    if (opts?.estado) query = query.eq('estado', opts.estado)
    if (opts?.origen) query = query.eq('origen', opts.origen)
    const { data, error, count } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: { rows: (data ?? []) as TCheque[], total: count ?? 0 } }
  },

  async actualizarEstado(
    id: string,
    estado: TEstadoCheque,
    fecha_cobro?: string
  ): Promise<ServiceResult<TCheque>> {
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

  async confirmarAcreditacion(id: string): Promise<ServiceResult<TCheque>> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('cheques')
      .update({
        acreditacion_confirmada: true,
        acreditacion_confirmada_at: new Date().toISOString(),
        acreditacion_confirmada_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .not('estado', 'in', '(EN_CARTERA,ANULADO)')
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          ok: false,
          error:
            'Solo se puede confirmar la acreditación de cheques depositados, endosados o rechazados',
          code: 'VALIDATION_ERROR',
        }
      }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }
    return { ok: true, data: data as TCheque }
  },

  async desmarcarAcreditacion(id: string): Promise<ServiceResult<TCheque>> {
    const { data, error } = await supabase
      .from('cheques')
      .update({
        acreditacion_confirmada: false,
        acreditacion_confirmada_at: null,
        acreditacion_confirmada_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCheque }
  },
}
