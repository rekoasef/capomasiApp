import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TCuentaCorriente } from '../types'

export const cuentaCorrienteService = {
  async getAll(): Promise<ServiceResult<TCuentaCorriente[]>> {
    const { data, error } = await supabase
      .from('v_cuenta_corriente')
      .select('*')
      .order('saldo_pendiente', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TCuentaCorriente[] }
  },

  async getDeudores(): Promise<ServiceResult<TCuentaCorriente[]>> {
    const { data, error } = await supabase
      .from('v_cuenta_corriente')
      .select('*')
      .gt('saldo_pendiente', 0)
      .order('saldo_pendiente', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TCuentaCorriente[] }
  },

  async getByCliente(clienteId: string): Promise<ServiceResult<TCuentaCorriente | null>> {
    const { data, error } = await supabase
      .from('v_cuenta_corriente')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCuentaCorriente | null }
  },
}
