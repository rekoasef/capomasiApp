import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import type { THonorarioMensual, THonorarioConCliente } from '../types'

export const honorariosService = {
  async getActivoByCliente(clienteId: string): Promise<ServiceResult<THonorarioMensual | null>> {
    const { data, error } = await supabase
      .from('honorarios_mensuales')
      .select('*')
      .eq('cliente_id', clienteId)
      .is('vigente_hasta', null)
      .maybeSingle()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? null }
  },

  async getHistorial(clienteId: string): Promise<ServiceResult<THonorarioMensual[]>> {
    const { data, error } = await supabase
      .from('honorarios_mensuales')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('vigente_desde', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? [] }
  },

  async getAllActivos(): Promise<ServiceResult<THonorarioConCliente[]>> {
    const { data, error } = await supabase
      .from('honorarios_mensuales')
      .select('*, clientes(nombre, cuit)')
      .is('vigente_hasta', null)
      .order('vigente_desde', { ascending: true })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as THonorarioConCliente[] }
  },

  async setInicial(
    clienteId: string,
    monto: number,
    frecuenciaAjusteMeses: number,
    notas?: string
  ): Promise<ServiceResult<THonorarioMensual>> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('honorarios_mensuales')
      .insert({
        cliente_id: clienteId,
        monto,
        frecuencia_ajuste_meses: frecuenciaAjusteMeses,
        vigente_desde: toLocalDateInputValue(),
        notas: notas ?? null,
        creado_por: user?.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'El cliente ya tiene un honorario activo', code: 'CONFLICT' }
      }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }
    return { ok: true, data }
  },

  async aplicarAjuste(
    clienteId: string,
    porcentaje: number,
    notas?: string
  ): Promise<ServiceResult<THonorarioMensual>> {
    const { data, error } = await supabase.rpc('fn_aplicar_ajuste_honorario', {
      p_cliente_id: clienteId,
      p_porcentaje: porcentaje,
      p_notas: notas ?? undefined,
      p_frecuencia_meses: undefined,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data }
  },
}
