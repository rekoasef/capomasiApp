import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TFacturacionHistorica } from '../types'

export const facturacionHistoricaService = {
  async getAll(): Promise<ServiceResult<TFacturacionHistorica[]>> {
    const { data, error } = await supabase
      .from('facturacion_historica')
      .select('*')
      .order('fecha_liquidacion', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? [] }
  },
}
