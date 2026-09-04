import { supabase } from '@/lib/supabase/client'
import { saldoInicialSchema } from '../schemas/saldoInicialSchema'
import { calcularTotalImputado } from './calcularSaldo'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TLiquidacionConImputaciones, TReciboDisponible, TSaldoInicial } from '../types'

export const saldoInicialService = {
  // Saldo con el que el cliente entró al sistema (null si nunca se cargó).
  // Puede estar cargado como deuda (liquidación SALDO_INICIAL) o como plata a
  // favor (recibo SALDO_INICIAL sin imputar). Nunca las dos a la vez: lo garantiza
  // fn_guardar_saldo_inicial.
  async getByCliente(clienteId: string): Promise<ServiceResult<TSaldoInicial | null>> {
    const { data: deuda, error: errorDeuda } = await supabase
      .from('liquidaciones')
      .select('*, imputaciones(*)')
      .eq('cliente_id', clienteId)
      .eq('tipo_liquidacion', 'SALDO_INICIAL')
      .neq('estado', 'ANULADA')
      .limit(1)
      .maybeSingle()

    if (errorDeuda) return { ok: false, error: errorDeuda.message, code: 'DB_ERROR' }

    if (deuda) {
      const liq = deuda as unknown as TLiquidacionConImputaciones
      return {
        ok: true,
        data: {
          tipo: 'DEUDA',
          id: liq.id,
          fecha: liq.fecha_liquidacion,
          importe: liq.importe_liquidado,
          detalle: liq.detalle,
          imputado: calcularTotalImputado(liq.imputaciones),
        },
      }
    }

    const { data: favor, error: errorFavor } = await supabase
      .from('v_recibos_disponibles')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('tipo_pago', 'SALDO_INICIAL')
      .limit(1)
      .maybeSingle()

    if (errorFavor) return { ok: false, error: errorFavor.message, code: 'DB_ERROR' }
    if (!favor) return { ok: true, data: null }

    const rec = favor as TReciboDisponible
    return {
      ok: true,
      data: {
        tipo: 'FAVOR',
        id: rec.id,
        fecha: rec.fecha,
        importe: rec.importe,
        detalle: rec.notas,
        imputado: rec.total_imputado,
      },
    }
  },

  // Alta o edición: la unicidad por cliente, el cambio de deuda a favor (y al
  // revés) y el tope contra lo ya imputado los resuelve fn_guardar_saldo_inicial
  // (migraciones 0067 y 0068).
  async guardar(form: unknown): Promise<ServiceResult<TSaldoInicial>> {
    const parsed = saldoInicialSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
    }

    const { data, error } = await supabase.rpc('fn_guardar_saldo_inicial', {
      p_cliente_id: parsed.data.cliente_id,
      p_fecha: parsed.data.fecha_liquidacion,
      p_importe: parsed.data.importe,
      p_detalle: parsed.data.detalle || undefined,
      p_a_favor: parsed.data.tipo === 'FAVOR',
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as unknown as TSaldoInicial }
  },
}
