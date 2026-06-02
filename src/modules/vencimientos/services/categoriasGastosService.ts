import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import { categoriaGastoSchema } from '../schemas/categoriaGastoSchema'
import type { TCategoriaGastoForm } from '../schemas/categoriaGastoSchema'
import type { TCategoriaGasto } from '../types'

export const categoriasGastosService = {
  async getAll(opts?: { includeInactive?: boolean }): Promise<ServiceResult<TCategoriaGasto[]>> {
    let query = supabase
      .from('categorias_gastos')
      .select('*')
      .order('nombre')

    if (!opts?.includeInactive) query = query.eq('activo', true)

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TCategoriaGasto[] }
  },

  async create(form: TCategoriaGastoForm): Promise<ServiceResult<TCategoriaGasto>> {
    const parsed = categoriaGastoSchema.safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const { data, error } = await supabase
      .from('categorias_gastos')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCategoriaGasto }
  },

  async update(id: string, form: Partial<TCategoriaGastoForm>): Promise<ServiceResult<TCategoriaGasto>> {
    const parsed = categoriaGastoSchema.partial().safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const { data, error } = await supabase
      .from('categorias_gastos')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCategoriaGasto }
  },

  async toggleActiva(id: string, activo: boolean): Promise<ServiceResult<TCategoriaGasto>> {
    return categoriasGastosService.update(id, { activo })
  },

  async eliminar(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('categorias_gastos').delete().eq('id', id)
    if (error) {
      if ('code' in error && error.code === '23503') {
        return {
          ok: false,
          error: 'No se puede eliminar una categoría con gastos asociados. Desactivala para conservar el historial.',
          code: 'CONFLICT',
        }
      }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }
    return { ok: true, data: undefined }
  },
}
