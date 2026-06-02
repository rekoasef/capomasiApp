import { supabase } from '@/lib/supabase/client'
import { claveSchema } from '../schemas/claveSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TClave } from '../types'
import type { TClaveForm } from '../schemas/claveSchema'

export const clavesService = {
  async getByCliente(clienteId: string): Promise<ServiceResult<TClave[]>> {
    const { data, error } = await supabase
      .from('claves_clientes')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('tipo')

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? [] }
  },

  async upsert(clienteId: string, form: TClaveForm): Promise<ServiceResult<TClave>> {
    const parsed = claveSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('claves_clientes')
      .upsert(
        { ...parsed.data, cliente_id: clienteId, updated_by: user?.id, updated_at: new Date().toISOString() },
        { onConflict: 'cliente_id,tipo' }
      )
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data }
  },

  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.from('claves_clientes').delete().eq('id', id)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: null }
  },
}
