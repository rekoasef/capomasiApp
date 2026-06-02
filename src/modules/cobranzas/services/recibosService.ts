import { supabase } from '@/lib/supabase/client'
import { reciboSchema } from '../schemas/reciboSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TRecibo, TReciboDisponible, TImputacionInline } from '../types'

type RegistrarParams = {
  cliente_id: string
  fecha: string
  tipo_pago: 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE' | 'USD'
  importe: number
  numero_recibo?: string
  cuenta_bancaria?: string
  importe_usd?: number
  tipo_cambio?: number
  cheque_numero?: string
  cheque_banco?: string
  cheque_fecha_cobro?: string
  vuelto_efectivo?: number
  notas?: string
  imputaciones?: TImputacionInline[]
}

export const recibosService = {
  async registrar(form: unknown): Promise<ServiceResult<TRecibo[]>> {
    const parsed = reciboSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }
    return registrarRecibo(parsed.data)
  },

  async getByCliente(clienteId: string): Promise<ServiceResult<TReciboDisponible[]>> {
    const { data, error } = await supabase
      .from('v_recibos_disponibles')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TReciboDisponible[] }
  },

  async getDisponiblesByCliente(clienteId: string): Promise<ServiceResult<TReciboDisponible[]>> {
    const { data, error } = await supabase
      .from('v_recibos_disponibles')
      .select('*')
      .eq('cliente_id', clienteId)
      .gt('saldo_libre', 0)
      .order('fecha', { ascending: true })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TReciboDisponible[] }
  },

  async getById(id: string): Promise<ServiceResult<TReciboDisponible | null>> {
    const { data, error } = await supabase
      .from('v_recibos_disponibles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data as TReciboDisponible) ?? null }
  },

  async anular(id: string, motivo?: string): Promise<ServiceResult<TRecibo>> {
    const { data, error } = await supabase.rpc('fn_anular_recibo', {
      p_recibo_id: id,
      p_motivo: motivo,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TRecibo }
  },
}

async function registrarRecibo(params: RegistrarParams): Promise<ServiceResult<TRecibo[]>> {
  let chequeId: string | null = null
  const vuelto = params.vuelto_efectivo ?? 0

  if (params.tipo_pago === 'CHEQUE' && params.cheque_numero && params.cheque_banco) {
    // El cheque cubre el importe total menos el vuelto en efectivo
    const importeCheque = Math.round((params.importe - vuelto + Number.EPSILON) * 100) / 100
    const { data: cheque, error: chequeError } = await supabase
      .from('cheques')
      .insert({
        tipo: 'TERCERO',
        numero: params.cheque_numero,
        banco: params.cheque_banco,
        importe: importeCheque,
        fecha_emision: params.fecha,
        fecha_cobro: params.cheque_fecha_cobro ?? null,
        origen: 'CLIENTE',
        estado: 'EN_CARTERA',
        cliente_id: params.cliente_id,
      })
      .select()
      .single()

    if (chequeError) return { ok: false, error: chequeError.message, code: 'DB_ERROR' }
    chequeId = cheque.id
  }

  const imputacionesPayload = (params.imputaciones ?? []).map((i) => ({
    liquidacion_id: i.liquidacion_id,
    importe: i.importe,
  }))

  const { data, error } = await supabase.rpc('fn_registrar_recibo', {
    p_cliente_id: params.cliente_id,
    p_fecha: params.fecha,
    p_tipo_pago: params.tipo_pago,
    p_importe: params.importe,
    p_imputaciones: imputacionesPayload,
    p_numero_recibo: params.numero_recibo ?? undefined,
    p_importe_usd: params.importe_usd ?? undefined,
    p_tipo_cambio: params.tipo_cambio ?? undefined,
    p_cuenta_bancaria: params.cuenta_bancaria ?? undefined,
    p_cheque_id: chequeId ?? undefined,
    p_notas: params.notas ?? undefined,
    p_vuelto_efectivo: vuelto > 0 ? vuelto : undefined,
  })

  if (error) {
    if (chequeId) {
      await supabase.from('cheques').delete().eq('id', chequeId)
    }
    return { ok: false, error: error.message, code: 'DB_ERROR' }
  }

  // El RPC retorna JSONB con array de recibos creados (1 ó 2 por auto-split)
  const recibos = Array.isArray(data) ? (data as TRecibo[]) : [data as TRecibo]
  return { ok: true, data: recibos }
}
