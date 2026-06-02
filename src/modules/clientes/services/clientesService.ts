import { supabase } from '@/lib/supabase/client'
import { clienteSchema } from '../schemas/clienteSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TCliente } from '../types'
import type { TClienteForm } from '../schemas/clienteSchema'

export const clientesService = {
  async getAll(): Promise<ServiceResult<TCliente[]>> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .is('deleted_at', null)
      .order('nombre')

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? [] }
  },

  async getById(id: string): Promise<ServiceResult<TCliente>> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return { ok: false, error: 'Cliente no encontrado', code: 'NOT_FOUND' }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }
    return { ok: true, data }
  },

  async search(query: string): Promise<ServiceResult<TCliente[]>> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .is('deleted_at', null)
      .or(`nombre.ilike.%${query}%,cuit.ilike.%${query}%,localidad.ilike.%${query}%`)
      .order('nombre')
      .limit(50)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? [] }
  },

  async create(form: TClienteForm): Promise<ServiceResult<TCliente>> {
    const parsed = clienteSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ya existe un cliente con ese CUIT', code: 'CONFLICT' }
      }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }
    return { ok: true, data }
  },

  async update(id: string, form: TClienteForm): Promise<ServiceResult<TCliente>> {
    const parsed = clienteSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('clientes')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ya existe un cliente con ese CUIT', code: 'CONFLICT' }
      }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }
    return { ok: true, data }
  },

  async softDelete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('clientes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: null }
  },
}
