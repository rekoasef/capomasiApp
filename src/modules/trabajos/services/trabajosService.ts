import { supabase } from '@/lib/supabase/client'
import { trabajoSchema, actualizarEstadoSchema } from '../schemas/trabajoSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TTrabajo, TTrabajoConCliente, TEstadoTrabajo } from '../types'
import { ESTADO_SIGUIENTE as SIGUIENTE } from '../types'

export const trabajosService = {
  async getByCliente(clienteId: string): Promise<ServiceResult<TTrabajo[]>> {
    const { data, error } = await supabase
      .from('honorarios_anuales')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('anio', { ascending: false })
      .order('tipo_trabajo')

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TTrabajo[] }
  },

  async getAll(anio?: number): Promise<ServiceResult<TTrabajoConCliente[]>> {
    let query = supabase
      .from('honorarios_anuales')
      .select('*, clientes(nombre, cuit)')
      .order('anio', { ascending: false })
      .order('estado')

    if (anio) query = query.eq('anio', anio)

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TTrabajoConCliente[] }
  },

  async getPendientes(): Promise<ServiceResult<TTrabajoConCliente[]>> {
    const { data, error } = await supabase
      .from('honorarios_anuales')
      .select('*, clientes(nombre, cuit)')
      .in('estado', ['PENDIENTE', 'EN_PROCESO'])
      .order('anio', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TTrabajoConCliente[] }
  },

  async create(form: unknown): Promise<ServiceResult<TTrabajo>> {
    const parsed = trabajoSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { empleada_ids, ...trabajoData } = parsed.data

    const { data, error } = await supabase
      .from('honorarios_anuales')
      .insert(trabajoData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ya existe un trabajo de ese tipo para ese cliente y año', code: 'CONFLICT' }
      }
      return { ok: false, error: error.message, code: 'DB_ERROR' }
    }

    if (empleada_ids?.length) {
      const { error: assignError } = await (supabase as any)
        .from('honorarios_anuales_empleadas')
        .insert(empleada_ids.map((id) => ({ honorario_anual_id: data.id, empleada_id: id })))
      if (assignError) return { ok: false, error: assignError.message, code: 'DB_ERROR' }
    }

    return { ok: true, data: data as TTrabajo }
  },

  async avanzarEstado(id: string, honorario?: number, notas?: string): Promise<ServiceResult<TTrabajo>> {
    const { data: actual, error: fetchError } = await supabase
      .from('honorarios_anuales')
      .select('estado, honorario')
      .eq('id', id)
      .single()

    if (fetchError) return { ok: false, error: fetchError.message, code: 'DB_ERROR' }

    const siguiente = SIGUIENTE[actual.estado as TEstadoTrabajo]
    if (!siguiente) return { ok: false, error: 'El trabajo ya está en el estado final', code: 'VALIDATION_ERROR' }

    if (siguiente === 'COBRADO' && !honorario && !actual.honorario) {
      return { ok: false, error: 'Ingresá el honorario antes de marcar como cobrado', code: 'VALIDATION_ERROR' }
    }

    const update: { estado: TEstadoTrabajo; honorario?: number; notas?: string } = { estado: siguiente }
    if (honorario) update.honorario = honorario
    if (notas) update.notas = notas

    const { data, error } = await supabase
      .from('honorarios_anuales')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TTrabajo }
  },

  async retrocederEstado(id: string): Promise<ServiceResult<TTrabajo>> {
    const { data: actual, error: fetchError } = await supabase
      .from('honorarios_anuales')
      .select('estado')
      .eq('id', id)
      .single()

    if (fetchError) return { ok: false, error: fetchError.message, code: 'DB_ERROR' }

    const estados: TEstadoTrabajo[] = ['PENDIENTE', 'EN_PROCESO', 'FINALIZADO', 'COBRADO']
    const idx = estados.indexOf(actual.estado as TEstadoTrabajo)
    if (idx <= 0) return { ok: false, error: 'No se puede retroceder desde Pendiente', code: 'VALIDATION_ERROR' }

    const { data, error } = await supabase
      .from('honorarios_anuales')
      .update({ estado: estados[idx - 1] })
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TTrabajo }
  },

  async update(id: string, fields: { honorario?: number; notas?: string; asignado_a?: string }): Promise<ServiceResult<TTrabajo>> {
    const { data, error } = await supabase
      .from('honorarios_anuales')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TTrabajo }
  },

  async eliminar(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('honorarios_anuales')
      .delete()
      .eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: null }
  },
}
