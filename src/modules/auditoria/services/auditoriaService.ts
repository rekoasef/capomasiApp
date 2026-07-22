import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TAuditLog } from '../types'

export const auditoriaService = {
  async getAll(opts?: {
    tabla?: string
    page?: number
    pageSize?: number
  }): Promise<ServiceResult<{ rows: TAuditLog[]; total: number }>> {
    const pageSize = opts?.pageSize ?? 25
    const page = opts?.page ?? 0
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('audit_log')
      .select('*, usuarios(nombre)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (opts?.tabla) query = query.eq('tabla_afectada', opts.tabla)

    const { data, error, count } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: { rows: (data ?? []) as unknown as TAuditLog[], total: count ?? 0 } }
  },
}
