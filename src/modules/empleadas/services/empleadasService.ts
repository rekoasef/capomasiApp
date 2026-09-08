import { supabase } from '@/lib/supabase/client'
import {
  empleadaSchema,
  liquidacionEmpleadaSchema,
  pagoEmpleadaSchema,
} from '../schemas/empleadaSchema'
import { calcularLiquidacionMes } from './calcularLiquidacionMes'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TEmpleada, TLiquidacionEmpleada, TPagoEmpleada, TResumenPeriodo } from '../types'
import type {
  TEmpleadaForm,
  TLiquidacionEmpleadaForm,
  TPagoEmpleadaForm,
} from '../schemas/empleadaSchema'

export const empleadasService = {
  async getAll(): Promise<ServiceResult<TEmpleada[]>> {
    const { data, error } = await supabase
      .from('empleadas')
      .select('*')
      .is('deleted_at', null)
      .order('nombre')
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as unknown as TEmpleada[] }
  },

  async create(form: TEmpleadaForm): Promise<ServiceResult<TEmpleada>> {
    const parsed = empleadaSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase.from('empleadas').insert(parsed.data).select().single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TEmpleada }
  },

  async getById(id: string): Promise<ServiceResult<TEmpleada>> {
    const { data, error } = await supabase
      .from('empleadas')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    if (!data) return { ok: false, error: 'Empleada no encontrada', code: 'NOT_FOUND' }
    return { ok: true, data: data as unknown as TEmpleada }
  },

  async update(id: string, form: Partial<TEmpleadaForm>): Promise<ServiceResult<TEmpleada>> {
    const parsed = empleadaSchema.partial().safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase
      .from('empleadas')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TEmpleada }
  },

  async softDelete(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase
      .from('empleadas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  // --- Liquidaciones ---

  async getLiquidaciones(
    empleadaId: string,
    anio?: number
  ): Promise<ServiceResult<TLiquidacionEmpleada[]>> {
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

  async crearLiquidacion(
    form: TLiquidacionEmpleadaForm
  ): Promise<ServiceResult<TLiquidacionEmpleada>> {
    const parsed = liquidacionEmpleadaSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase
      .from('liquidaciones_empleadas')
      .insert(parsed.data)
      .select()
      .single()
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
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase
      .from('pagos_empleadas')
      .insert(parsed.data)
      .select()
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TPagoEmpleada }
  },

  // --- Resumen por periodo ---

  async getResumenPeriodo(anio: number, mes: number): Promise<ServiceResult<TResumenPeriodo[]>> {
    const { data: emp, error: empErr } = await supabase
      .from('empleadas')
      .select('id, nombre')
      .is('deleted_at', null)
    if (empErr) return { ok: false, error: empErr.message, code: 'DB_ERROR' }

    // Sin filtro de período: el arrastre necesita el historial completo para
    // saber qué quedó de los meses anteriores.
    const { data: liq, error: liqErr } = await supabase
      .from('liquidaciones_empleadas')
      .select('empleada_id, periodo_anio, periodo_mes, tipo_concepto, importe')
    if (liqErr) return { ok: false, error: liqErr.message, code: 'DB_ERROR' }

    const { data: pagos, error: pagosErr } = await supabase
      .from('pagos_empleadas')
      .select('empleada_id, periodo_anio, periodo_mes, importe')
    if (pagosErr) return { ok: false, error: pagosErr.message, code: 'DB_ERROR' }

    const resumen: TResumenPeriodo[] = (emp ?? []).map((e) => {
      const totales = calcularLiquidacionMes(
        (liq ?? []).filter((l) => l.empleada_id === e.id),
        (pagos ?? []).filter((p) => p.empleada_id === e.id),
        anio,
        mes
      )
      return {
        empleada_id: e.id,
        empleada_nombre: e.nombre,
        periodo_mes: mes,
        periodo_anio: anio,
        total_haberes: totales.totalHaberes,
        total_descuentos: totales.totalDescuentos,
        neto: totales.neto,
        total_pagado: totales.totalPagado,
        saldo_anterior: totales.saldoAnterior,
        saldo: totales.pendiente,
      }
    })

    return { ok: true, data: resumen }
  },
}
