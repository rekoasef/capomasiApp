import { supabase } from '@/lib/supabase/client'
import { reciboSchema, totalMedios, type TReciboForm } from '../schemas/reciboSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TRecibo, TReciboDisponible } from '../types'

// Lo que viaja al RPC como p_medios. El cheque ya viene creado (cheque_id):
// los datos del papel (número, banco) viven en la tabla cheques, no acá.
type MedioPayload = {
  tipo_pago: string
  importe: number
  cuenta_bancaria?: string
  cheque_id?: string
  importe_usd?: number
  tipo_cambio?: number
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

async function registrarRecibo(params: TReciboForm): Promise<ServiceResult<TRecibo[]>> {
  const vuelto = params.vuelto_efectivo ?? 0
  const importeTotal = totalMedios(params.medios)

  // Cada cheque del cobro entra a cartera como su propio cheque. Se crean
  // antes del recibo porque el medio los referencia por id; si el RPC falla
  // después se borran todos, para no dejar cheques huérfanos en la cartera.
  const chequesCreados: string[] = []
  const medios: MedioPayload[] = []

  for (const medio of params.medios) {
    if (medio.tipo_pago === 'CHEQUE') {
      // El schema ya lo exige; el chequeo acá es para estrechar el tipo antes
      // de insertar en cheques, donde número y banco no son opcionales.
      if (!medio.cheque_numero || !medio.cheque_banco) {
        await borrarCheques(chequesCreados)
        return {
          ok: false,
          error: 'Falta el número o el banco de uno de los cheques',
          code: 'VALIDATION_ERROR',
        }
      }

      // Con vuelto, el cheque queda registrado por lo que efectivamente
      // se cobra — el resto vuelve al cliente en efectivo.
      const importeCheque = Math.round((medio.importe - vuelto + Number.EPSILON) * 100) / 100
      const { data: cheque, error: chequeError } = await supabase
        .from('cheques')
        .insert({
          tipo: 'TERCERO',
          numero: medio.cheque_numero,
          banco: medio.cheque_banco,
          importe: importeCheque,
          fecha_emision: params.fecha,
          fecha_cobro: medio.cheque_fecha_cobro || null,
          origen: 'CLIENTE',
          estado: 'EN_CARTERA',
          cliente_id: params.cliente_id,
        })
        .select()
        .single()

      if (chequeError) {
        await borrarCheques(chequesCreados)
        return { ok: false, error: chequeError.message, code: 'DB_ERROR' }
      }

      chequesCreados.push(cheque.id)
      medios.push({
        tipo_pago: 'CHEQUE',
        importe: medio.importe,
        cheque_id: cheque.id,
      })
      continue
    }

    medios.push({
      tipo_pago: medio.tipo_pago,
      importe: medio.importe,
      cuenta_bancaria: medio.cuenta_bancaria || undefined,
      importe_usd: medio.importe_usd ?? undefined,
      tipo_cambio: medio.tipo_cambio ?? undefined,
    })
  }

  const imputacionesPayload = (params.imputaciones ?? []).map((i) => ({
    liquidacion_id: i.liquidacion_id,
    importe: i.importe,
  }))

  const primero = medios[0]

  const { data, error } = await supabase.rpc('fn_registrar_recibo', {
    p_cliente_id: params.cliente_id,
    p_fecha: params.fecha,
    // p_tipo_pago sigue siendo obligatorio en la firma; con p_medios cargado
    // el RPC lo ignora y calcula el tipo del recibo (o MIXTO) desde los medios.
    p_tipo_pago: primero.tipo_pago,
    p_importe: importeTotal,
    p_medios: medios,
    p_imputaciones: imputacionesPayload,
    p_numero_recibo: params.numero_recibo || undefined,
    p_notas: params.notas || undefined,
    p_vuelto_efectivo: vuelto > 0 ? vuelto : undefined,
  })

  if (error) {
    await borrarCheques(chequesCreados)
    return { ok: false, error: error.message, code: 'DB_ERROR' }
  }

  // El RPC devuelve un array — hoy siempre de un recibo, pero antes podían
  // salir dos por el corte de series y la firma se mantuvo.
  const recibos = Array.isArray(data) ? (data as TRecibo[]) : [data as TRecibo]
  return { ok: true, data: recibos }
}

async function borrarCheques(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await supabase.from('cheques').delete().in('id', ids)
}
