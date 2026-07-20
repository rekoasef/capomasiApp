import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type {
  TResumenDashboard,
  TIngresoMensual,
  TResumenEmpleadaDashboard,
  TVencimientoResumen,
} from '../types'

const getHoy = () => new Date().toISOString().slice(0, 10)
const getEn7Dias = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export const dashboardService = {
  async getResumen(): Promise<ServiceResult<TResumenDashboard>> {
    return dashboardService.getResumenAdmin()
  },

  async getResumenAdmin(): Promise<ServiceResult<TResumenDashboard>> {
    const hoy = getHoy()
    const en7 = getEn7Dias()

    const [
      ingresosResult,
      resultadoResult,
      deudaResult,
      trabajosResult,
      colaResult,
      proxResult,
      vencidosResult,
      impuestosPersonalesResult,
    ] = await Promise.all([
      supabase
        .from('v_ingresos_mensuales')
        .select(
          'mes, cantidad_liquidaciones, total_liquidado, total_facturado, ingreso_base_negro, facturado_cliente_neto, iva_facturado'
        )
        .order('mes', { ascending: false })
        .limit(6),

      supabase
        .from('v_resultado_mensual')
        .select(
          'mes, total_ingresos, gasto_sueldos, gasto_proveedores, gasto_manual_estudio, resultado'
        )
        .order('mes', { ascending: false })
        .limit(1),

      supabase.from('v_cuenta_corriente').select('saldo_pendiente').gt('saldo_pendiente', 0),

      supabase
        .from('honorarios_anuales')
        .select('estado')
        .in('estado', ['PENDIENTE', 'EN_PROCESO']),

      supabase
        .from('vencimientos')
        .select('id', { count: 'exact', head: true })
        .in('ambito', ['CLIENTE', 'ESTUDIO'])
        .eq('estado_avance', 'TERMINADO')
        .eq('facturado', false),

      supabase
        .from('vencimientos')
        .select('id', { count: 'exact', head: true })
        .in('ambito', ['CLIENTE', 'ESTUDIO'])
        .eq('completado', false)
        .gte('fecha_vencimiento', hoy)
        .lte('fecha_vencimiento', en7),

      supabase
        .from('vencimientos')
        .select('id', { count: 'exact', head: true })
        .in('ambito', ['CLIENTE', 'ESTUDIO'])
        .eq('completado', false)
        .lt('fecha_vencimiento', hoy),

      supabase
        .from('vencimientos')
        .select('id', { count: 'exact', head: true })
        .eq('ambito', 'PERSONAL')
        .eq('completado', false)
        .lte('fecha_vencimiento', hoy),
    ])

    if (ingresosResult.error)
      return { ok: false, error: ingresosResult.error.message, code: 'DB_ERROR' }
    if (resultadoResult.error)
      return { ok: false, error: resultadoResult.error.message, code: 'DB_ERROR' }
    if (deudaResult.error) return { ok: false, error: deudaResult.error.message, code: 'DB_ERROR' }

    const rawMeses = ingresosResult.data ?? []
    const meses: TIngresoMensual[] = rawMeses.map((r) => ({
      mes: r.mes ?? '',
      cantidad_liquidaciones: r.cantidad_liquidaciones ?? 0,
      total_liquidado: r.total_liquidado ?? 0,
      total_facturado: r.total_facturado ?? 0,
      ingreso_base_negro: r.ingreso_base_negro ?? 0,
      facturado_cliente_neto: r.facturado_cliente_neto ?? 0,
      iva_facturado: r.iva_facturado ?? 0,
    }))

    const mesActual = meses[0] ?? {
      total_liquidado: 0,
      total_facturado: 0,
      ingreso_base_negro: 0,
      facturado_cliente_neto: 0,
      iva_facturado: 0,
    }
    const deudores = deudaResult.data ?? []
    const trabajos = (trabajosResult.data ?? []) as { estado: string }[]

    const resultadoRow = resultadoResult.data?.[0]
    const resultadoMesActual = {
      mes: resultadoRow?.mes ?? '',
      total_ingresos: resultadoRow?.total_ingresos ?? 0,
      gasto_sueldos: resultadoRow?.gasto_sueldos ?? 0,
      gasto_proveedores: resultadoRow?.gasto_proveedores ?? 0,
      gasto_manual_estudio: resultadoRow?.gasto_manual_estudio ?? 0,
      resultado: resultadoRow?.resultado ?? 0,
    }

    return {
      ok: true,
      data: {
        ingresos_mes_actual: mesActual.total_liquidado,
        facturado_mes_actual: mesActual.total_facturado,
        ingreso_base_negro_mes_actual: mesActual.ingreso_base_negro,
        facturado_cliente_neto_mes_actual: mesActual.facturado_cliente_neto,
        iva_facturado_mes_actual: mesActual.iva_facturado,
        resultado_mes_actual: resultadoMesActual,
        deuda_total_clientes: deudores.reduce((sum, r) => sum + (r.saldo_pendiente ?? 0), 0),
        clientes_deudores: deudores.length,
        ultimos_6_meses: meses,
        trabajos_pendientes: trabajos.filter((t) => t.estado === 'PENDIENTE').length,
        trabajos_en_proceso: trabajos.filter((t) => t.estado === 'EN_PROCESO').length,
        cola_facturacion: colaResult.count ?? 0,
        vencimientos_proximos_7_dias: proxResult.count ?? 0,
        vencimientos_vencidos: vencidosResult.count ?? 0,
        impuestos_personales_vencidos: impuestosPersonalesResult.count ?? 0,
      },
    }
  },

  async getResumenEmpleada(empleadaId: string): Promise<ServiceResult<TResumenEmpleadaDashboard>> {
    const hoy = getHoy()
    const en7 = getEn7Dias()

    const mesActual = new Date().getMonth() + 1
    const anioActual = new Date().getFullYear()
    const desdesMes = `${anioActual}-${String(mesActual).padStart(2, '0')}-01`
    const lastDay = new Date(anioActual, mesActual, 0).getDate()
    const hastaMes = `${anioActual}-${String(mesActual).padStart(2, '0')}-${lastDay}`

    const [pendResult, proxResult, puntosResult] = await Promise.all([
      supabase
        .from('vencimientos')
        .select('estado_avance')
        .eq('empleada_id', empleadaId)
        .in('ambito', ['CLIENTE', 'ESTUDIO'])
        .gte('fecha_vencimiento', desdesMes)
        .lte('fecha_vencimiento', hastaMes),

      supabase
        .from('vencimientos')
        .select('id, descripcion, fecha_vencimiento, estado_avance, clientes(nombre)')
        .eq('empleada_id', empleadaId)
        .in('ambito', ['CLIENTE', 'ESTUDIO'])
        .eq('completado', false)
        .gte('fecha_vencimiento', hoy)
        .lte('fecha_vencimiento', en7)
        .order('fecha_vencimiento'),

      supabase
        .from('registros_puntaje_empleadas')
        .select('puntos')
        .eq('empleada_id', empleadaId)
        .eq('periodo_mes', mesActual)
        .eq('periodo_anio', anioActual),
    ])

    const items = (pendResult.data ?? []) as { estado_avance: string }[]
    const prox = (proxResult.data ?? []) as {
      id: string
      descripcion: string
      fecha_vencimiento: string
      estado_avance: string
      clientes: { nombre: string } | null
    }[]
    const puntosRows = (puntosResult.data ?? []) as { puntos: number }[]
    const totalPuntos = puntosRows.reduce((sum, r) => sum + (r.puntos ?? 0), 0)

    const hoyDate = new Date(hoy)
    const vencimientosResumen: TVencimientoResumen[] = prox.map((v) => ({
      id: v.id,
      descripcion: v.descripcion,
      cliente_nombre: v.clientes?.nombre ?? '—',
      fecha_vencimiento: v.fecha_vencimiento,
      estado_avance: v.estado_avance,
      dias_restantes: Math.ceil(
        (new Date(v.fecha_vencimiento).getTime() - hoyDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return {
      ok: true,
      data: {
        mis_pendientes: items.filter((i) => i.estado_avance === 'PENDIENTE').length,
        mis_en_proceso: items.filter((i) => ['INICIADO', 'EN_PROCESO'].includes(i.estado_avance))
          .length,
        mis_terminados_mes: items.filter((i) => ['TERMINADO', 'APROBADO'].includes(i.estado_avance))
          .length,
        mis_puntos_mes: totalPuntos,
        vencimientos_proximos: vencimientosResumen,
      },
    }
  },
}
