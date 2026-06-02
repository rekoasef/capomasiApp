import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TImputacion, TImputacionDetalle } from '../types'

export const imputacionesService = {
  async imputar(params: {
    recibo_id: string
    liquidacion_id: string
    importe: number
    notas?: string
  }): Promise<ServiceResult<TImputacion>> {
    if (!params.recibo_id || !params.liquidacion_id) {
      return { ok: false, error: 'Recibo y liquidación requeridos', code: 'VALIDATION_ERROR' }
    }
    if (!params.importe || params.importe <= 0) {
      return { ok: false, error: 'Importe inválido', code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase.rpc('fn_imputar_recibo', {
      p_recibo_id: params.recibo_id,
      p_liquidacion_id: params.liquidacion_id,
      p_importe: params.importe,
      p_notas: params.notas,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TImputacion }
  },

  async eliminar(imputacionId: string): Promise<ServiceResult<true>> {
    const { error } = await supabase.rpc('fn_eliminar_imputacion', {
      p_imputacion_id: imputacionId,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: true }
  },

  async getByRecibo(reciboId: string): Promise<ServiceResult<TImputacionDetalle[]>> {
    const { data, error } = await supabase
      .from('v_imputaciones_detalle')
      .select('*')
      .eq('recibo_id', reciboId)
      .order('created_at', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TImputacionDetalle[] }
  },

  async getByLiquidacion(liquidacionId: string): Promise<ServiceResult<TImputacionDetalle[]>> {
    const { data, error } = await supabase
      .from('v_imputaciones_detalle')
      .select('*')
      .eq('liquidacion_id', liquidacionId)
      .order('created_at', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TImputacionDetalle[] }
  },

  async getByCliente(clienteId: string): Promise<ServiceResult<TImputacionDetalle[]>> {
    const { data, error } = await supabase
      .from('v_imputaciones_detalle')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TImputacionDetalle[] }
  },
}
