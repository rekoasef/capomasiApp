import { supabase } from '@/lib/supabase/client'
import {
  proveedorSchema,
  compraProveedorSchema,
  pagoProveedorSchema,
  gastoProveedorSchema,
} from '../schemas/proveedorSchema'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TProveedor, TCompraProveedor, TPagoProveedor, THistorialEgreso } from '../types'
import type {
  TProveedorForm,
  TCompraProveedorForm,
  TPagoProveedorForm,
  TGastoProveedorForm,
} from '../schemas/proveedorSchema'

export const proveedoresService = {
  async getAll(): Promise<ServiceResult<TProveedor[]>> {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .is('deleted_at', null)
      .order('nombre')
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data ?? [] }
  },

  async create(form: TProveedorForm): Promise<ServiceResult<TProveedor>> {
    const parsed = proveedorSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase.from('proveedores').insert(parsed.data).select().single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data }
  },

  async update(id: string, form: Partial<TProveedorForm>): Promise<ServiceResult<TProveedor>> {
    const parsed = proveedorSchema.partial().safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase
      .from('proveedores')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data }
  },

  async softDelete(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase
      .from('proveedores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  // --- Compras ---

  async getCompras(opts?: {
    proveedorId?: string
    estado?: string
    page?: number
    pageSize?: number
  }): Promise<ServiceResult<{ rows: TCompraProveedor[]; total: number }>> {
    const pageSize = opts?.pageSize ?? 25
    const page = opts?.page ?? 0
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('compras_proveedores')
      .select('*, proveedores(nombre)', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(from, to)
    if (opts?.proveedorId) query = query.eq('proveedor_id', opts.proveedorId)
    // Las compras anuladas son cargas equivocadas de antes de la 0075,
    // cuando anular no borraba. No ensucian más el historial.
    if (opts?.estado) query = query.eq('estado', opts.estado)
    else query = query.neq('estado', 'ANULADA')
    const { data, error, count } = await query
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return {
      ok: true,
      data: { rows: (data ?? []) as unknown as TCompraProveedor[], total: count ?? 0 },
    }
  },

  async crearCompra(form: TCompraProveedorForm): Promise<ServiceResult<TCompraProveedor>> {
    const parsed = compraProveedorSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    const { data, error } = await supabase
      .from('compras_proveedores')
      .insert(parsed.data)
      .select()
      .single()
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TCompraProveedor }
  },

  // Borra la compra revirtiendo todo lo que generó: devuelve el cheque
  // endosado a cartera, borra el EGRESO en fondos y el pago. Antes esto
  // era anularCompra, que solo marcaba el estado y dejaba la plata viva
  // en la caja (ver migración 0075).
  async eliminarCompra(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase.rpc('fn_eliminar_compra_proveedor', {
      p_compra_id: id,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: undefined }
  },

  // --- Pagos a proveedores ---

  async getPagos(compraId: string): Promise<ServiceResult<TPagoProveedor[]>> {
    const { data, error } = await supabase
      .from('pagos_proveedores')
      .select('*')
      .eq('compra_id', compraId)
      .order('fecha_pago', { ascending: false })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TPagoProveedor[] }
  },

  async registrarPago(form: TPagoProveedorForm): Promise<ServiceResult<TPagoProveedor>> {
    const parsed = pagoProveedorSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    let chequeId: string | undefined
    if (parsed.data.tipo_pago === 'CHEQUE') {
      const { data: compra, error: compraError } = await supabase
        .from('compras_proveedores')
        .select('proveedor_id')
        .eq('id', parsed.data.compra_id)
        .single()
      if (compraError || !compra) {
        return {
          ok: false,
          error: compraError?.message ?? 'Compra no encontrada',
          code: 'DB_ERROR',
        }
      }

      const { data: cheque, error: chequeError } = await supabase
        .from('cheques')
        .insert({
          tipo: 'PROPIO',
          origen: 'EMITIDO',
          numero: parsed.data.cheque_numero!,
          banco: parsed.data.cheque_banco!,
          importe: parsed.data.importe,
          fecha_emision: parsed.data.cheque_fecha_emision!,
          proveedor_id: compra.proveedor_id,
          cuenta_bancaria: parsed.data.cuenta_bancaria ?? null,
        })
        .select()
        .single()
      if (chequeError || !cheque) {
        return {
          ok: false,
          error: chequeError?.message ?? 'Error creando el cheque',
          code: 'DB_ERROR',
        }
      }
      chequeId = cheque.id
    }

    const { data, error } = await supabase.rpc('fn_registrar_pago_proveedor', {
      p_compra_id: parsed.data.compra_id,
      p_tipo_pago: parsed.data.tipo_pago,
      p_importe: parsed.data.importe,
      p_fecha_pago: parsed.data.fecha_pago,
      p_cuenta_bancaria: parsed.data.cuenta_bancaria ?? undefined,
      p_cheque_id: chequeId,
      p_notas: parsed.data.notas ?? undefined,
    })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TPagoProveedor }
  },

  // --- Gasto (compra + pago en un solo paso, sin estado pendiente) ---

  async crearGastoPagado(form: TGastoProveedorForm): Promise<ServiceResult<TCompraProveedor>> {
    const parsed = gastoProveedorSchema.safeParse(form)
    if (!parsed.success)
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }

    const compraResult = await this.crearCompra({
      proveedor_id: parsed.data.proveedor_id,
      fecha: parsed.data.fecha,
      concepto: parsed.data.concepto,
      nro_comprobante: parsed.data.nro_comprobante,
      tipo_comprobante: parsed.data.tipo_comprobante,
      importe_total: parsed.data.importe_total,
      ambito: parsed.data.ambito,
      notas: parsed.data.notas,
    })
    if (!compraResult.ok) return compraResult

    // Sin medio de pago la compra queda PENDIENTE, lista para pagarse
    // después o para recibir el endoso de un cheque de cartera.
    if (!parsed.data.tipo_pago) return compraResult

    const pagoResult = await this.registrarPago({
      compra_id: compraResult.data.id,
      tipo_pago: parsed.data.tipo_pago,
      importe: parsed.data.importe_total,
      fecha_pago: parsed.data.fecha,
      cuenta_bancaria: parsed.data.cuenta_bancaria,
      cheque_numero: parsed.data.cheque_numero,
      cheque_banco: parsed.data.cheque_banco,
      cheque_fecha_emision: parsed.data.cheque_fecha_emision,
    })
    if (!pagoResult.ok) return { ok: false, error: pagoResult.error, code: pagoResult.code }

    return { ok: true, data: { ...compraResult.data, estado: 'PAGADA' } }
  },

  // --- Historial de egresos (proveedores + gastos del estudio + sueldos) ---

  async getHistorialEgresos(): Promise<ServiceResult<THistorialEgreso[]>> {
    const { data, error } = await supabase
      .from('v_historial_egresos_estudio')
      .select('*')
      .order('fecha', { ascending: false })
    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as THistorialEgreso[] }
  },
}
