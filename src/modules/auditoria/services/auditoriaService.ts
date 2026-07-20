import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TAuditLog } from '../types'

export const auditoriaService = {
  async getAll(opts?: { tabla?: string; limit?: number }): Promise<ServiceResult<TAuditLog[]>> {
    let query = supabase
      .from('audit_log')
      .select('*, usuarios(nombre)')
      .order('created_at', { ascending: false })
      .limit(opts?.limit ?? 100)
    if (opts?.tabla) query = query.eq('tabla_afectada', opts.tabla)
    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TAuditLog[] }
  },
}
