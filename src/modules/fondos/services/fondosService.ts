import { supabase } from '@/lib/supabase/client'
import {
  esCambioDeMoneda,
  fondoMovimientoSchema,
  transferenciaFondosSchema,
} from '../schemas/fondoSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TCuentaFondos, TFondoMovimiento, TSaldoFondos } from '../types'
import type { TFondoMovimientoForm, TTransferenciaFondosForm } from '../schemas/fondoSchema'

const COLUMNA_POR_CUENTA: Record<TCuentaFondos, string> = {
  banco: 'importe_banco',
  cheques_cartera: 'importe_cheques_cartera',
  efectivo: 'importe_efectivo',
  usd: 'importe_usd',
  taralo: 'importe_taralo',
}

export const fondosService = {
  async getMovimientos(opts?: {
    desde?: string
    hasta?: string
    tipo?: string
    cuenta?: TCuentaFondos
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
    // Filtrar por cuenta = quedarse con los movimientos que la tocaron.
    // Un movimiento puede tocar dos (comprar dólares con efectivo mueve
    // las dos columnas), así que aparece bajo cualquiera de las dos.
    if (opts?.cuenta) query = query.neq(COLUMNA_POR_CUENTA[opts.cuenta], 0)
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

  async transferir(form: TTransferenciaFondosForm): Promise<ServiceResult<TFondoMovimiento[]>> {
    const parsed = transferenciaFondosSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    // Entre cuentas en pesos no se manda importe de destino: la DB
    // rechaza que difiera y el formulario ni siquiera lo pregunta.
    const cambioDeMoneda = esCambioDeMoneda(parsed.data.origen, parsed.data.destino)
    const { data, error } = await supabase.rpc('fn_transferir_fondos', {
      p_origen: parsed.data.origen,
      p_destino: parsed.data.destino,
      p_importe: parsed.data.importe,
      p_fecha: parsed.data.fecha,
      p_concepto: parsed.data.concepto,
      p_notas: parsed.data.notas ?? undefined,
      p_importe_destino: cambioDeMoneda ? (parsed.data.importe_destino ?? undefined) : undefined,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TFondoMovimiento[] }
  },
}
