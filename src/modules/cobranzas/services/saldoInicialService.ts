import { supabase } from '@/lib/supabase/client'
import { saldoInicialSchema } from '../schemas/saldoInicialSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TLiquidacion, TLiquidacionConImputaciones } from '../types'

export const saldoInicialService = {
  // Saldo inicial vigente del cliente (null si nunca se cargó o se anuló).
  async getByCliente(
    clienteId: string
  ): Promise<ServiceResult<TLiquidacionConImputaciones | null>> {
    const { data, error } = await supabase
      .from('liquidaciones')
      .select('*, imputaciones(*)')
      .eq('cliente_id', clienteId)
      .eq('tipo_liquidacion', 'SALDO_INICIAL')
      .neq('estado', 'ANULADA')
      .limit(1)
      .maybeSingle()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data as unknown as TLiquidacionConImputaciones) ?? null }
  },

  // Alta o edición: la unicidad por cliente y el tope contra lo ya cobrado
  // los resuelve fn_guardar_saldo_inicial (migración 0067).
  async guardar(form: unknown): Promise<ServiceResult<TLiquidacion>> {
    const parsed = saldoInicialSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase.rpc('fn_guardar_saldo_inicial', {
      p_cliente_id: parsed.data.cliente_id,
      p_fecha: parsed.data.fecha_liquidacion,
      p_importe: parsed.data.importe,
      p_detalle: parsed.data.detalle ?? null,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TLiquidacion }
  },
}
