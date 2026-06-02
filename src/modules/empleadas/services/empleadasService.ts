import { supabase } from '@/lib/supabase/client'
import { empleadaSchema, liquidacionEmpleadaSchema, pagoEmpleadaSchema } from '../schemas/empleadaSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TEmpleada, TLiquidacionEmpleada, TPagoEmpleada, TResumenPeriodo } from '../types'
import type { TEmpleadaForm, TLiquidacionEmpleadaForm, TPagoEmpleadaForm } from '../schemas/empleadaSchema'

export const empleadasService = {
  async getAll(): Promise<ServiceResult<TEmpleada[]>> {
    const db = supabase as any
    const { data, error } = await db
      .from('empleadas')
      .select('*')
      .is('deleted_at', null)
      .order('nombre')
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TEmpleada[] }
  },

  async create(form: TEmpleadaForm): Promise<ServiceResult<TEmpleada>> {
    const parsed = empleadaSchema.safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const db = supabase as any
    const { data, error } = await db.from('empleadas').insert(parsed.data).select().single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TEmpleada }
  },

  async getById(id: string): Promise<ServiceResult<TEmpleada>> {
    const db = supabase as any
    const { data, error } = await db
      .from('empleadas')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    if (!data) return { ok: false, error: 'Empleada no encontrada', code: 'NOT_FOUND' }
    return { ok: true, data: data as TEmpleada }
  },

  async update(id: string, form: Partial<TEmpleadaForm>): Promise<ServiceResult<TEmpleada>> {
    const parsed = empleadaSchema.partial().safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const db = supabase as any
    const { data, error } = await db.from('empleadas').update(parsed.data).eq('id', id).select().single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TEmpleada }
  },

  async softDelete(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('empleadas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  // --- Liquidaciones ---

  async getLiquidaciones(empleadaId: string, anio?: number): Promise<ServiceResult<TLiquidacionEmpleada[]>> {
    let query = supabase
      .from('liquidaciones_empleadas')
      .select('*')
      .eq('empleada_id', empleadaId)
      .order('periodo_anio', { ascending: false })
      .order('periodo_mes', { ascending: false })
    if (anio) query = query.eq('periodo_anio', anio)
    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TLiquidacionEmpleada[] }
  },

  async crearLiquidacion(form: TLiquidacionEmpleadaForm): Promise<ServiceResult<TLiquidacionEmpleada>> {
    const parsed = liquidacionEmpleadaSchema.safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase.from('liquidaciones_empleadas').insert(parsed.data).select().single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TLiquidacionEmpleada }
  },

  async eliminarLiquidacion(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.from('liquidaciones_empleadas').delete().eq('id', id)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  // --- Pagos ---

  async getPagos(empleadaId: string, anio?: number): Promise<ServiceResult<TPagoEmpleada[]>> {
    let query = supabase
      .from('pagos_empleadas')
      .select('*')
      .eq('empleada_id', empleadaId)
      .order('fecha_pago', { ascending: false })
    if (anio) query = query.eq('periodo_anio', anio)
    const { data, error } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TPagoEmpleada[] }
  },

  async registrarPago(form: TPagoEmpleadaForm): Promise<ServiceResult<TPagoEmpleada>> {
    const parsed = pagoEmpleadaSchema.safeParse(form)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase.from('pagos_empleadas').insert(parsed.data).select().single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TPagoEmpleada }
  },

  // --- Resumen por periodo ---

  async getResumenPeriodo(anio: number, mes: number): Promise<ServiceResult<TResumenPeriodo[]>> {
    const { data: emp, error: empErr } = await supabase.from('empleadas').select('id, nombre').is('deleted_at', null)
    if (empErr) return { ok: false, error: empErr.message, code: 'DB_ERROR' }

    const { data: liq, error: liqErr } = await supabase
      .from('liquidaciones_empleadas')
      .select('*')
      .eq('periodo_anio', anio)
      .eq('periodo_mes', mes)
    if (liqErr) return { ok: false, error: liqErr.message, code: 'DB_ERROR' }

    const { data: pagos, error: pagosErr } = await supabase
      .from('pagos_empleadas')
      .select('*')
      .eq('periodo_anio', anio)
      .eq('periodo_mes', mes)
    if (pagosErr) return { ok: false, error: pagosErr.message, code: 'DB_ERROR' }

    const resumen: TResumenPeriodo[] = (emp ?? []).map((e) => {
      const items = (liq ?? []).filter((l) => l.empleada_id === e.id)
      const total_haberes    = items.filter((l) => l.tipo_concepto === 'HABER').reduce((s, l) => s + Number(l.importe), 0)
      const total_descuentos = items.filter((l) => l.tipo_concepto === 'DESCUENTO').reduce((s, l) => s + Number(l.importe), 0)
      const total_pagado     = (pagos ?? []).filter((p) => p.empleada_id === e.id).reduce((s, p) => s + Number(p.importe), 0)
      const neto = total_haberes - total_descuentos
      return {
        empleada_id:    e.id,
        empleada_nombre: e.nombre,
        periodo_mes:    mes,
        periodo_anio:   anio,
        total_haberes,
        total_descuentos,
        neto,
        total_pagado,
        saldo: neto - total_pagado,
      }
    })

    return { ok: true, data: resumen }
  },
}
