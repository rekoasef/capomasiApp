import { supabase } from '@/lib/supabase/client'
import { fondoMovimientoSchema } from '../schemas/fondoSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TFondoMovimiento, TSaldoFondos } from '../types'
import type { TFondoMovimientoForm } from '../schemas/fondoSchema'

export const fondosService = {
  async getMovimientos(opts?: {
    desde?: string
    hasta?: string
    tipo?: string
    page?: number
    pageSize?: number
  }): Promise<ServiceResult<{ rows: TFondoMovimiento[]; total: number }>> {
    const pageSize = opts?.pageSize ?? 25
    const page = opts?.page ?? 0
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('fondos_movimientos')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(from, to)
    if (opts?.desde) query = query.gte('fecha', opts.desde)
    if (opts?.hasta) query = query.lte('fecha', opts.hasta)
    if (opts?.tipo) query = query.eq('tipo_movimiento', opts.tipo)
    const { data, error, count } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: { rows: (data ?? []) as TFondoMovimiento[], total: count ?? 0 } }
  },

  async getSaldo(): Promise<ServiceResult<TSaldoFondos>> {
    const { data, error } = await supabase.from('v_saldo_fondos').select('*').single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return {
      ok: true,
      data: {
        saldo_banco: Number(data.saldo_banco ?? 0),
        saldo_efectivo: Number(data.saldo_efectivo ?? 0),
        saldo_usd: Number(data.saldo_usd ?? 0),
        saldo_taralo: Number(data.saldo_taralo ?? 0),
        saldo_cheques_cartera: Number(data.saldo_cheques_cartera ?? 0),
      },
    }
  },

  async registrar(form: TFondoMovimientoForm): Promise<ServiceResult<TFondoMovimiento>> {
    const parsed = fondoMovimientoSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase
      .from('fondos_movimientos')
      .insert(parsed.data)
      .select()
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TFondoMovimiento }
  },

  async eliminar(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('fondos_movimientos').delete().eq('id', id)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },
}
