import { supabase } from '@/lib/supabase/client'
import {
  vencimientoFiscalSchema,
  actualizarEstadoAvanceSchema,
} from '../schemas/vencimientoFiscalSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type {
  TVencimientoFiscal,
  TVencimientoFiscalConCliente,
  TVencimientosFiscalesFilters,
  TEstadoAvance,
} from '../types'

type TPuntoConfigRow = {
  id: string
  cliente_id: string
  empleada_id: string | null
  tipo_trabajo: string
  puntos: number
  facturar_aparte: boolean
  tipo_vencimiento: string
  dia_vencimiento_mensual: number | null
  mes_vencimiento_anual: number | null
  dia_vencimiento_anual: number | null
  created_at: string
}

export const vencimientosFiscalesService = {
  async getAll(
    filtros?: TVencimientosFiscalesFilters
  ): Promise<ServiceResult<TVencimientoFiscalConCliente[]>> {
    let query = supabase
      .from('vencimientos')
      .select('*, clientes(nombre, cuit), empleadas(nombre, apellido)')
      .in('ambito', ['CLIENTE', 'ESTUDIO'])
      .order('fecha_vencimiento')

    if (filtros?.empleadaId) {
      query = query.eq('empleada_id', filtros.empleadaId)
    }
    if (filtros?.estadoAvance && filtros.estadoAvance !== 'TODOS') {
      query = query.eq('estado_avance', filtros.estadoAvance)
    }
    if (filtros?.soloSinFacturar) {
      query = query.eq('facturado', false)
    }
    if (filtros?.ambito) {
      query = query.eq('ambito', filtros.ambito)
    }
    if (filtros?.anio && filtros?.mes) {
      const desde = `${filtros.anio}-${String(filtros.mes).padStart(2, '0')}-01`
      const lastDay = new Date(filtros.anio, filtros.mes, 0).getDate()
      const hasta = `${filtros.anio}-${String(filtros.mes).padStart(2, '0')}-${lastDay}`
      query = query.gte('fecha_vencimiento', desde).lte('fecha_vencimiento', hasta)
    } else if (filtros?.anio) {
      query = query
        .gte('fecha_vencimiento', `${filtros.anio}-01-01`)
        .lte('fecha_vencimiento', `${filtros.anio}-12-31`)
    }

    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TVencimientoFiscalConCliente[] }
  },

  async getByEmpleada(
    empleadaId: string,
    filtros?: Omit<TVencimientosFiscalesFilters, 'empleadaId'>
  ): Promise<ServiceResult<TVencimientoFiscalConCliente[]>> {
    return vencimientosFiscalesService.getAll({ ...filtros, empleadaId })
  },

  async getParaAprobar(): Promise<ServiceResult<TVencimientoFiscalConCliente[]>> {
    const { data, error } = await supabase
      .from('vencimientos')
      .select('*, clientes(nombre, cuit), empleadas(nombre, apellido)')
      .in('ambito', ['CLIENTE', 'ESTUDIO'])
      .eq('estado_avance', 'TERMINADO')
      .eq('facturado', false)
      .order('fecha_vencimiento')

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TVencimientoFiscalConCliente[] }
  },

  async getColaFacturacion(): Promise<ServiceResult<TVencimientoFiscalConCliente[]>> {
    const { data, error } = await supabase
      .from('vencimientos')
      .select('*, clientes(nombre, cuit), empleadas(nombre, apellido)')
      .in('ambito', ['CLIENTE', 'ESTUDIO'])
      .eq('estado_avance', 'APROBADO')
      .eq('facturado', false)
      .eq('facturar_aparte', true)
      .order('fecha_vencimiento')

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TVencimientoFiscalConCliente[] }
  },

  async aprobar(id: string): Promise<ServiceResult<TVencimientoFiscal>> {
    return vencimientosFiscalesService.actualizarEstadoAvance(id, 'APROBADO')
  },

  // Historial de trabajos ya aprobados, sin importar si van a factura aparte,
  // quedan incluidos en el abono, o ya están facturados. Paginado: puede crecer
  // sin límite con el uso real del estudio.
  async getCompletados(filtros?: {
    clienteId?: string
    empleadaId?: string
    tipoVencimiento?: string
    facturacion?: 'FACTURADO' | 'FALTA_FACTURAR' | 'ABONO'
    page?: number
    pageSize?: number
  }): Promise<ServiceResult<{ rows: TVencimientoFiscalConCliente[]; total: number }>> {
    const pageSize = filtros?.pageSize ?? 25
    const page = filtros?.page ?? 0
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('vencimientos')
      .select('*, clientes(nombre, cuit), empleadas(nombre, apellido)', { count: 'exact' })
      .in('ambito', ['CLIENTE', 'ESTUDIO'])
      .eq('estado_avance', 'APROBADO')
      .order('fecha_vencimiento', { ascending: false })
      .range(from, to)

    if (filtros?.clienteId) query = query.eq('cliente_id', filtros.clienteId)
    if (filtros?.empleadaId) query = query.eq('empleada_id', filtros.empleadaId)
    if (filtros?.tipoVencimiento) query = query.eq('tipo_vencimiento', filtros.tipoVencimiento)
    if (filtros?.facturacion === 'FACTURADO') {
      query = query.eq('facturado', true)
    } else if (filtros?.facturacion === 'FALTA_FACTURAR') {
      query = query.eq('facturado', false).eq('facturar_aparte', true)
    } else if (filtros?.facturacion === 'ABONO') {
      query = query.eq('facturar_aparte', false)
    }

    const { data, error, count } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return {
      ok: true,
      data: {
        rows: (data ?? []) as unknown as TVencimientoFiscalConCliente[],
        total: count ?? 0,
      },
    }
  },

  async create(form: unknown): Promise<ServiceResult<TVencimientoFiscal>> {
    const parsed = vencimientoFiscalSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    // Permitir campos extra (puntos_config_id, puntos_snapshot, facturar_aparte) cuando se crea desde config A_DEMANDA
    const formRecord = form && typeof form === 'object' ? (form as Record<string, unknown>) : {}
    const extra = {
      puntos_config_id: (formRecord.puntos_config_id as string | undefined) ?? null,
      puntos_snapshot: (formRecord.puntos_snapshot as number | undefined) ?? null,
      facturar_aparte: (formRecord.facturar_aparte as boolean | undefined) ?? true,
    }

    const { data, error } = await supabase
      .from('vencimientos')
      .insert({ ...parsed.data, ...extra })
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TVencimientoFiscal }
  },

  async update(
    id: string,
    fields: Partial<
      Pick<
        TVencimientoFiscal,
        'descripcion' | 'fecha_vencimiento' | 'empleada_id' | 'notas' | 'tipo_vencimiento'
      >
    >
  ): Promise<ServiceResult<TVencimientoFiscal>> {
    const { data, error } = await supabase
      .from('vencimientos')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TVencimientoFiscal }
  },

  async actualizarEstadoAvance(
    id: string,
    estadoAvance: TEstadoAvance,
    observaciones?: string
  ): Promise<ServiceResult<TVencimientoFiscal>> {
    const parsed = actualizarEstadoAvanceSchema.safeParse({
      estado_avance: estadoAvance,
      observaciones_empleada: observaciones,
    })
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase
      .from('vencimientos')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TVencimientoFiscal }
  },

  async marcarTerminado(
    id: string,
    observaciones?: string
  ): Promise<ServiceResult<TVencimientoFiscal>> {
    return vencimientosFiscalesService.actualizarEstadoAvance(id, 'TERMINADO', observaciones)
  },

  async marcarFacturado(
    id: string,
    liquidacionId: string
  ): Promise<ServiceResult<TVencimientoFiscal>> {
    const { data, error } = await supabase
      .from('vencimientos')
      .update({ facturado: true, liquidacion_id: liquidacionId })
      .eq('id', id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TVencimientoFiscal }
  },

  async eliminar(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.from('vencimientos').delete().eq('id', id)

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: null }
  },

  // Genera instancias de vencimientos para un mes/año a partir de puntos_trabajo_config.
  // Idempotente: no crea duplicados si ya existe un vencimiento con el mismo puntos_config_id en ese mes.
  async generarDesdeConfig(anio: number, mes: number): Promise<ServiceResult<{ creados: number }>> {
    // 1. Configs activas con recurrencia automática
    const { data: configs, error: configErr } = await supabase
      .from('puntos_trabajo_config')
      .select(
        'id, cliente_id, empleada_id, tipo_trabajo, puntos, facturar_aparte, tipo_vencimiento, dia_vencimiento_mensual, mes_vencimiento_anual, dia_vencimiento_anual, created_at'
      )
      .eq('activo', true)
      .in('tipo_vencimiento', ['MENSUAL', 'ANUAL'])

    if (configErr) return { ok: false, error: configErr.message, code: 'DB_ERROR' }
    if (!configs?.length) return { ok: true, data: { creados: 0 } }

    // 2. Filtrar las que aplican a este mes
    const relevantes = (configs as TPuntoConfigRow[]).filter((c) => {
      if (c.tipo_vencimiento === 'MENSUAL') return true
      if (c.tipo_vencimiento === 'ANUAL') return c.mes_vencimiento_anual === mes
      return false
    })

    if (!relevantes.length) return { ok: true, data: { creados: 0 } }

    // 3. Detectar las que ya tienen vencimiento en este mes (evita duplicados)
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
    const maxDia = new Date(anio, mes, 0).getDate()
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(maxDia).padStart(2, '0')}`
    const ids = relevantes.map((c) => c.id)

    const { data: existentes, error: existErr } = await supabase
      .from('vencimientos')
      .select('puntos_config_id')
      .in('puntos_config_id', ids)
      .gte('fecha_vencimiento', desde)
      .lte('fecha_vencimiento', hasta)

    if (existErr) return { ok: false, error: existErr.message, code: 'DB_ERROR' }

    const yaExisten = new Set((existentes ?? []).map((e) => e.puntos_config_id))

    // 4. Construir registros a insertar
    const nuevos = relevantes
      .filter((c) => !yaExisten.has(c.id))
      .map((c) => {
        const dia =
          c.tipo_vencimiento === 'MENSUAL' ? c.dia_vencimiento_mensual : c.dia_vencimiento_anual

        if (dia == null) return null

        // Ajustar al último día del mes si el día configurado no existe (ej: 31 en febrero)
        const diaFinal = Math.min(dia, maxDia)
        const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`

        // No generar si el vencimiento cae antes o en la misma fecha de creación de la config.
        // Ej: config creada el 02/07 con vencimiento el 01 → primer instancia es 01/08, no 01/07.
        const fechaCreacion = c.created_at ? c.created_at.slice(0, 10) : '1900-01-01'
        if (fecha <= fechaCreacion) return null

        // Descripción legible a partir del tipo_trabajo (ej: "GANANCIAS_PF" → "Ganancias PF")
        const descripcion = c.tipo_trabajo
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')

        return {
          cliente_id: c.cliente_id,
          empleada_id: c.empleada_id ?? null,
          tipo_vencimiento: c.tipo_trabajo,
          fecha_vencimiento: fecha,
          descripcion,
          ambito: 'CLIENTE',
          estado_avance: 'PENDIENTE',
          puntos_config_id: c.id,
          puntos_snapshot: c.puntos,
          facturar_aparte: c.facturar_aparte,
        }
      })

    const nuevosFiltrados = nuevos.filter((n): n is NonNullable<typeof n> => n !== null)
    if (!nuevosFiltrados.length) return { ok: true, data: { creados: 0 } }

    const { error: insertErr } = await supabase.from('vencimientos').insert(nuevosFiltrados)

    if (insertErr) {
      // 23505 = unique_violation: race condition entre dos llamadas simultáneas — ya fue insertado
      if (insertErr.code === '23505') return { ok: true, data: { creados: 0 } }
      return { ok: false, error: insertErr.message, code: 'DB_ERROR' }
    }

    return { ok: true, data: { creados: nuevosFiltrados.length } }
  },
}
