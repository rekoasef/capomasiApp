import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TCheque } from '@/modules/cobranzas/types'
import type { TPagoProveedor } from '@/modules/proveedores/types'
import { chequeManualSchema, type TChequeManualForm } from '../schemas/fondoSchema'

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

  // Entregar un cheque de tercero (en cartera) a un proveedor para saldar
  // una compra — a diferencia de emitir un cheque propio. Registra el pago
  // real contra la compra y marca el cheque como ENDOSADO.
  async endosarAProveedor(params: {
    chequeId: string
    compraId: string
    importe: number
    fechaPago: string
    notas?: string
  }): Promise<ServiceResult<TPagoProveedor>> {
    const { data, error } = await supabase.rpc('fn_endosar_cheque_a_proveedor', {
      p_cheque_id: params.chequeId,
      p_compra_id: params.compraId,
      p_importe: params.importe,
      p_fecha_pago: params.fechaPago,
      p_notas: params.notas,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TPagoProveedor }
  },

  // Cargar un cheque que Paola ya tiene en mano por fuera de un recibo o un
  // pago (ej: saldos iniciales al migrar del Excel). Genera también el
  // movimiento en Fondos para que impacte en el saldo de cheques en cartera
  // igual que los cheques creados automáticamente.
  async crearManual(form: TChequeManualForm): Promise<ServiceResult<TCheque>> {
    const parsed = chequeManualSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const { data, error } = await supabase.rpc('fn_registrar_cheque_manual', {
      p_tipo: parsed.data.tipo,
      p_numero: parsed.data.numero,
      p_banco: parsed.data.banco,
      p_importe: parsed.data.importe,
      p_fecha_emision: parsed.data.fecha_emision,
      p_fecha_cobro: parsed.data.fecha_cobro ?? undefined,
      p_cliente_id: parsed.data.cliente_id ?? undefined,
      p_proveedor_id: parsed.data.proveedor_id ?? undefined,
      p_cuenta_bancaria: parsed.data.cuenta_bancaria ?? undefined,
      p_notas: parsed.data.notas ?? undefined,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCheque }
  },
}
