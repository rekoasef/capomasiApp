import { supabase } from '@/lib/supabase/client'
import { notaEmpleadaSchema } from '../schemas/notaEmpleadaSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TNotaEmpleada, TNotaEmpleadaConEmpleada, TNotasEmpleadaFilters } from '../types'

export const notasEmpleadasService = {
  async getAll(
    filtros?: TNotasEmpleadaFilters
  ): Promise<ServiceResult<TNotaEmpleadaConEmpleada[]>> {
    let query = supabase
      .from('notas_empleadas')
      .select('*, empleadas(nombre, apellido)')
      .is('deleted_at', null)

    if (filtros?.empleadaId) {
      query = query.eq('empleada_id', filtros.empleadaId)
    }
    if (filtros?.estado === 'ACTIVAS') {
      query = query.eq('finalizada', false)
    } else if (filtros?.estado === 'FINALIZADAS') {
      query = query.eq('finalizada', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TNotaEmpleadaConEmpleada[] }
  },

  async getByEmpleada(
    empleadaId: string,
    estado?: TNotasEmpleadaFilters['estado']
  ): Promise<ServiceResult<TNotaEmpleadaConEmpleada[]>> {
    return notasEmpleadasService.getAll({ empleadaId, estado })
  },

  async create(form: unknown): Promise<ServiceResult<TNotaEmpleada>> {
    const parsed = notaEmpleadaSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('notas_empleadas')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TNotaEmpleada }
  },

  async update(id: string, contenido: string): Promise<ServiceResult<TNotaEmpleada>> {
    const parsed = notaEmpleadaSchema.shape.contenido.safeParse(contenido)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('notas_empleadas')
      .update({ contenido: parsed.data })
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TNotaEmpleada }
  },

  async eliminar(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('notas_empleadas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: null }
  },

  async finalizar(id: string): Promise<ServiceResult<TNotaEmpleada>> {
    const { data, error } = await supabase.rpc('fn_finalizar_nota_empleada', {
      p_nota_id: id,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TNotaEmpleada }
  },
}
