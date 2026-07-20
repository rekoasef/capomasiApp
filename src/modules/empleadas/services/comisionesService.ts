import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import {
  comisionConfigSchema,
  registroPuntajeSchema,
  registroHorasSchema,
  puntosTrabajoConfigSchema,
  valoresPuntoTipoSchema,
} from '../schemas/empleadaSchema'
import type {
  TComisionConfigForm,
  TRegistroPuntajeForm,
  TRegistroHorasForm,
  TPuntosTrabajoConfigForm,
  TValoresPuntoTipoForm,
} from '../schemas/empleadaSchema'
import type {
  TComisionConfig,
  TRegistroPuntaje,
  TSaldoPuntaje,
  TRegistroHoras,
  TResumenComisionHoras,
  TResumenComisionPuntaje,
  TConfirmacionPuntaje,
  TPuntosTrabajoConfig,
  TValoresPuntoTipo,
  TComisionPuntajeRegistrada,
} from '../types'

export const comisionesService = {
  // ── Config ─────────────────────────────────────────────────

  async getConfig(empleadaId: string): Promise<ServiceResult<TComisionConfig | null>> {
    const { data, error } = await supabase
      .from('comisiones_config')
      .select('*')
      .eq('empleada_id', empleadaId)
      .lte('vigente_desde', new Date().toISOString().split('T')[0])
      .order('vigente_desde', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TComisionConfig | null }
  },

  async saveConfig(form: TComisionConfigForm): Promise<ServiceResult<TComisionConfig>> {
    const parsed = comisionConfigSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('comisiones_config')
      .upsert(parsed.data, { onConflict: 'empleada_id,vigente_desde' })
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TComisionConfig }
  },

  // ── Puntaje ────────────────────────────────────────────────

  async getPuntajePeriodo(
    empleadaId: string,
    periodoMes: number,
    periodoAnio: number
  ): Promise<ServiceResult<TRegistroPuntaje[]>> {
    const { data, error } = await supabase
      .from('registros_puntaje_empleadas')
      .select('*')
      .eq('empleada_id', empleadaId)
      .eq('periodo_mes', periodoMes)
      .eq('periodo_anio', periodoAnio)
      .order('created_at', { ascending: true })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TRegistroPuntaje[] }
  },

  async getSaldoPuntaje(empleadaId: string): Promise<ServiceResult<TSaldoPuntaje | null>> {
    const { data, error } = await supabase
      .from('saldo_puntaje_empleadas')
      .select('*')
      .eq('empleada_id', empleadaId)
      .maybeSingle()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TSaldoPuntaje | null }
  },

  async agregarPuntaje(form: TRegistroPuntajeForm): Promise<ServiceResult<TRegistroPuntaje>> {
    const parsed = registroPuntajeSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('registros_puntaje_empleadas')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TRegistroPuntaje }
  },

  async eliminarPuntaje(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('registros_puntaje_empleadas').delete().eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  async calcularPreviewPuntaje(
    empleadaId: string,
    periodoMes: number,
    periodoAnio: number
  ): Promise<ServiceResult<TResumenComisionPuntaje>> {
    const { data, error } = await supabase.rpc('fn_calcular_comision_puntaje', {
      p_empleada_id: empleadaId,
      p_periodo_mes: periodoMes,
      p_periodo_anio: periodoAnio,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    const row = Array.isArray(data) ? data[0] : data
    return {
      ok: true,
      data: {
        puntos_periodo: Number(row.puntos_periodo ?? 0),
        puntos_acumulados_prev: Number(row.puntos_acumulados_prev ?? 0),
        puntos_total: Number(row.puntos_total ?? 0),
        umbral: Number(row.umbral ?? 0),
        comision_generada: Number(row.comision_generada ?? 0),
        puntos_restantes: Number(row.puntos_restantes ?? 0),
      },
    }
  },

  async confirmarComisionPuntaje(
    empleadaId: string,
    periodoMes: number,
    periodoAnio: number
  ): Promise<ServiceResult<TConfirmacionPuntaje>> {
    const { data, error } = await supabase.rpc('fn_confirmar_comision_puntaje', {
      p_empleada_id: empleadaId,
      p_periodo_mes: periodoMes,
      p_periodo_anio: periodoAnio,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    const row = Array.isArray(data) ? data[0] : data
    return {
      ok: true,
      data: {
        comision_generada: Number(row.comision_generada ?? 0),
        puntos_restantes: Number(row.puntos_restantes ?? 0),
        registro_id: row.registro_id ?? null,
      },
    }
  },

  async getComisionesRegistradas(
    empleadaId: string
  ): Promise<ServiceResult<TComisionPuntajeRegistrada[]>> {
    const { data, error } = await supabase
      .from('comisiones_puntaje_registradas')
      .select('*')
      .eq('empleada_id', empleadaId)
      .order('periodo_anio', { ascending: false })
      .order('periodo_mes', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TComisionPuntajeRegistrada[] }
  },

  async liquidarComision(
    registroId: string
  ): Promise<ServiceResult<{ liquidacion_id: string | null }>> {
    const { data, error } = await supabase.rpc('fn_liquidar_comision_puntaje', {
      p_registro_id: registroId,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    const row = Array.isArray(data) ? data[0] : data
    return { ok: true, data: { liquidacion_id: row?.liquidacion_id ?? null } }
  },

  // ── Horas ──────────────────────────────────────────────────

  async getHorasPeriodo(
    empleadaId: string,
    periodoMes: number,
    periodoAnio: number
  ): Promise<ServiceResult<TRegistroHoras[]>> {
    const { data, error } = await supabase
      .from('registros_horas_empleadas')
      .select('*')
      .eq('empleada_id', empleadaId)
      .eq('periodo_mes', periodoMes)
      .eq('periodo_anio', periodoAnio)
      .order('fecha', { ascending: true })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TRegistroHoras[] }
  },

  async agregarHoras(form: TRegistroHorasForm): Promise<ServiceResult<TRegistroHoras>> {
    const parsed = registroHorasSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const fecha = new Date(`${parsed.data.fecha}T00:00:00`)
    const row = {
      ...parsed.data,
      periodo_mes: fecha.getUTCMonth() + 1,
      periodo_anio: fecha.getUTCFullYear(),
    }

    const { data, error } = await supabase
      .from('registros_horas_empleadas')
      .insert(row)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TRegistroHoras }
  },

  async eliminarHoras(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('registros_horas_empleadas').delete().eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  async calcularComisionHoras(
    empleadaId: string,
    periodoMes: number,
    periodoAnio: number
  ): Promise<ServiceResult<TResumenComisionHoras>> {
    const { data, error } = await supabase.rpc('fn_calcular_comision_horas', {
      p_empleada_id: empleadaId,
      p_periodo_mes: periodoMes,
      p_periodo_anio: periodoAnio,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    const row = Array.isArray(data) ? data[0] : data
    return {
      ok: true,
      data: {
        total_horas: Number(row.total_horas ?? 0),
        valor_hora: Number(row.valor_hora ?? 0),
        total_pagar: Number(row.total_pagar ?? 0),
      },
    }
  },

  async calcularComisionProduccion(
    empleadaId: string,
    periodoMes: number,
    periodoAnio: number
  ): Promise<ServiceResult<number>> {
    const { data, error } = await supabase.rpc('fn_calcular_comision_produccion', {
      p_empleada_id: empleadaId,
      p_periodo_mes: periodoMes,
      p_periodo_anio: periodoAnio,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: Number(data ?? 0) }
  },

  // ── Puntos por trabajo ─────────────────────────────────────

  async getPuntosTrabajoConfig(clienteId?: string): Promise<ServiceResult<TPuntosTrabajoConfig[]>> {
    let query = supabase
      .from('puntos_trabajo_config')
      .select('*, clientes(nombre), empleadas(nombre, apellido)')
      .order('tipo_trabajo')

    if (clienteId) query = query.eq('cliente_id', clienteId)

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TPuntosTrabajoConfig[] }
  },

  async upsertPuntosTrabajoConfig(
    form: TPuntosTrabajoConfigForm
  ): Promise<ServiceResult<TPuntosTrabajoConfig>> {
    const parsed = puntosTrabajoConfigSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    // fecha_demanda es un campo UI-only — no existe en puntos_trabajo_config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fecha_demanda: _fd, ...payload } = parsed.data as typeof parsed.data & {
      fecha_demanda?: unknown
    }

    const { data, error } = await supabase
      .from('puntos_trabajo_config')
      .upsert(payload, { onConflict: 'cliente_id,tipo_trabajo' })
      .select('*, clientes(nombre), empleadas(nombre, apellido)')
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TPuntosTrabajoConfig }
  },

  async deletePuntosTrabajoConfig(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('puntos_trabajo_config').delete().eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  // ── Valores de punto por tipo ──────────────────────────────

  async getValoresPuntoTipo(): Promise<ServiceResult<TValoresPuntoTipo[]>> {
    const { data, error } = await supabase
      .from('valores_punto_tipo')
      .select('*')
      .order('tipo_trabajo')
      .order('vigente_desde', { ascending: false })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TValoresPuntoTipo[] }
  },

  async upsertValoresPuntoTipo(
    form: TValoresPuntoTipoForm
  ): Promise<ServiceResult<TValoresPuntoTipo>> {
    const parsed = valoresPuntoTipoSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('valores_punto_tipo')
      .upsert(parsed.data, { onConflict: 'tipo_trabajo,vigente_desde' })
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TValoresPuntoTipo }
  },

  async deleteValoresPuntoTipo(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('valores_punto_tipo').delete().eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },
}
