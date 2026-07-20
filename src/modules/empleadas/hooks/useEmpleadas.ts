import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empleadasService } from '../services/empleadasService'
import { trabajosRealizadosService } from '../services/trabajosRealizadosService'
import { comisionesService } from '../services/comisionesService'
import { toast } from 'sonner'
import type {
  TEmpleadaForm,
  TLiquidacionEmpleadaForm,
  TPagoEmpleadaForm,
  TComisionConfigForm,
  TRegistroPuntajeForm,
  TRegistroHorasForm,
  TPuntosTrabajoConfigForm,
  TValoresPuntoTipoForm,
} from '../schemas/empleadaSchema'
import type {
  TAprobarTrabajoForm,
  TImportarComisionesForm,
  TTrabajoRealizadoForm,
} from '../services/trabajosRealizadosService'

export function useEmpleadas() {
  return useQuery({
    queryKey: ['empleadas'],
    queryFn: async () => {
      const r = await empleadasService.getAll()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useCrearEmpleada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TEmpleadaForm) => empleadasService.create(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Empleada creada')
      qc.invalidateQueries({ queryKey: ['empleadas'] })
    },
  })
}

export function useEliminarEmpleada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => empleadasService.softDelete(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Empleada eliminada')
      qc.invalidateQueries({ queryKey: ['empleadas'] })
    },
  })
}

export function useLiquidacionesEmpleada(empleadaId: string, anio?: number) {
  return useQuery({
    queryKey: ['liquidaciones_empleadas', empleadaId, anio],
    queryFn: async () => {
      const r = await empleadasService.getLiquidaciones(empleadaId, anio)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useCrearLiquidacionEmpleada(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TLiquidacionEmpleadaForm) => empleadasService.crearLiquidacion(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Concepto agregado')
      qc.invalidateQueries({ queryKey: ['liquidaciones_empleadas', empleadaId] })
      qc.invalidateQueries({ queryKey: ['resumen_periodo'] })
    },
  })
}

export function useEliminarLiquidacionEmpleada(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => empleadasService.eliminarLiquidacion(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Concepto eliminado')
      qc.invalidateQueries({ queryKey: ['liquidaciones_empleadas', empleadaId] })
      qc.invalidateQueries({ queryKey: ['resumen_periodo'] })
    },
  })
}

export function usePagosEmpleada(empleadaId: string, anio?: number) {
  return useQuery({
    queryKey: ['pagos_empleadas', empleadaId, anio],
    queryFn: async () => {
      const r = await empleadasService.getPagos(empleadaId, anio)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useRegistrarPagoEmpleada(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TPagoEmpleadaForm) => empleadasService.registrarPago(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Pago registrado')
      qc.invalidateQueries({ queryKey: ['pagos_empleadas', empleadaId] })
      qc.invalidateQueries({ queryKey: ['resumen_periodo'] })
    },
  })
}

export function useResumenPeriodo(anio: number, mes: number) {
  return useQuery({
    queryKey: ['resumen_periodo', anio, mes],
    queryFn: async () => {
      const r = await empleadasService.getResumenPeriodo(anio, mes)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useTrabajosRealizados(
  periodoAnio: number,
  periodoMes: number,
  empleadaId?: string
) {
  return useQuery({
    queryKey: ['trabajos_realizados', periodoAnio, periodoMes, empleadaId ?? 'all'],
    queryFn: async () => {
      const r = await trabajosRealizadosService.getByPeriodo({
        periodo_anio: periodoAnio,
        periodo_mes: periodoMes,
        empleada_id: empleadaId,
      })
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useCargarTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TTrabajoRealizadoForm) => trabajosRealizadosService.crear(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      const n = r.data.length
      toast.success(n > 1 ? `${n} trabajos cargados` : 'Trabajo cargado')
      qc.invalidateQueries({ queryKey: ['trabajos_realizados'] })
    },
  })
}

export function useAprobarTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TAprobarTrabajoForm) => trabajosRealizadosService.aprobar(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Trabajo aprobado')
      qc.invalidateQueries({ queryKey: ['trabajos_realizados'] })
    },
  })
}

export function useImportarComisiones() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TImportarComisionesForm) =>
      trabajosRealizadosService.importarComisiones(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(`Se importaron ${r.data.length} comisiones`)
      qc.invalidateQueries({ queryKey: ['trabajos_realizados'] })
      qc.invalidateQueries({ queryKey: ['liquidaciones_empleadas'] })
      qc.invalidateQueries({ queryKey: ['resumen_periodo'] })
    },
  })
}

export function useImportarComisionIndividual(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (trabajoId: string) =>
      trabajosRealizadosService.importarComisionIndividual(trabajoId),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['trabajos_realizados'] })
      qc.invalidateQueries({ queryKey: ['liquidaciones_empleadas', empleadaId] })
      qc.invalidateQueries({ queryKey: ['resumen_periodo'] })
    },
  })
}

export function useActualizarEmpleada(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: Partial<TEmpleadaForm>) => empleadasService.update(empleadaId, form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Datos actualizados')
      qc.invalidateQueries({ queryKey: ['empleadas'] })
      qc.invalidateQueries({ queryKey: ['empleada', empleadaId] })
    },
  })
}

export function useEmpleadaById(empleadaId: string) {
  return useQuery({
    queryKey: ['empleada', empleadaId],
    queryFn: async () => {
      const r = await empleadasService.getById(empleadaId)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

// ── Comisiones ────────────────────────────────────────────────

export function useComisionConfig(empleadaId: string) {
  return useQuery({
    queryKey: ['comision_config', empleadaId],
    queryFn: async () => {
      const r = await comisionesService.getConfig(empleadaId)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useSaveComisionConfig(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TComisionConfigForm) => comisionesService.saveConfig(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['comision_config', empleadaId] })
    },
  })
}

// ── Puntaje ────────────────────────────────────────────────────

export function usePuntajePeriodo(empleadaId: string, periodoMes: number, periodoAnio: number) {
  return useQuery({
    queryKey: ['puntaje_periodo', empleadaId, periodoAnio, periodoMes],
    queryFn: async () => {
      const r = await comisionesService.getPuntajePeriodo(empleadaId, periodoMes, periodoAnio)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useSaldoPuntaje(empleadaId: string) {
  return useQuery({
    queryKey: ['saldo_puntaje', empleadaId],
    queryFn: async () => {
      const r = await comisionesService.getSaldoPuntaje(empleadaId)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useAgregarPuntaje(empleadaId: string, periodoMes: number, periodoAnio: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TRegistroPuntajeForm) => comisionesService.agregarPuntaje(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Puntaje registrado')
      qc.invalidateQueries({ queryKey: ['puntaje_periodo', empleadaId, periodoAnio, periodoMes] })
      qc.invalidateQueries({ queryKey: ['preview_puntaje', empleadaId, periodoAnio, periodoMes] })
    },
  })
}

export function useEliminarPuntaje(empleadaId: string, periodoMes: number, periodoAnio: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => comisionesService.eliminarPuntaje(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Registro eliminado')
      qc.invalidateQueries({ queryKey: ['puntaje_periodo', empleadaId, periodoAnio, periodoMes] })
      qc.invalidateQueries({ queryKey: ['preview_puntaje', empleadaId, periodoAnio, periodoMes] })
    },
  })
}

export function usePreviewPuntaje(empleadaId: string, periodoMes: number, periodoAnio: number) {
  return useQuery({
    queryKey: ['preview_puntaje', empleadaId, periodoAnio, periodoMes],
    queryFn: async () => {
      const r = await comisionesService.calcularPreviewPuntaje(empleadaId, periodoMes, periodoAnio)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useConfirmarComisionPuntaje(
  empleadaId: string,
  periodoMes: number,
  periodoAnio: number
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      comisionesService.confirmarComisionPuntaje(empleadaId, periodoMes, periodoAnio),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      if (r.data.comision_generada > 0) {
        toast.success('Comisión registrada — podés importarla a la liquidación cuando quieras')
      } else {
        toast.success(`Saldo actualizado. Puntos acumulados: ${r.data.puntos_restantes}`)
      }
      qc.invalidateQueries({ queryKey: ['puntaje_periodo', empleadaId, periodoAnio, periodoMes] })
      qc.invalidateQueries({ queryKey: ['saldo_puntaje', empleadaId] })
      qc.invalidateQueries({ queryKey: ['preview_puntaje', empleadaId, periodoAnio, periodoMes] })
      qc.invalidateQueries({ queryKey: ['comisiones_registradas', empleadaId] })
    },
  })
}

export function useAjustarSaldoPuntaje(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ puntos, nota }: { puntos: number; nota?: string }) =>
      comisionesService.ajustarSaldoPuntaje(empleadaId, puntos, nota),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(`Puntos descontados. Saldo restante: ${r.data.puntos_acumulados} pts`)
      qc.invalidateQueries({ queryKey: ['saldo_puntaje', empleadaId] })
      qc.invalidateQueries({ queryKey: ['preview_puntaje', empleadaId] })
    },
  })
}

export function useComisionesRegistradas(empleadaId: string) {
  return useQuery({
    queryKey: ['comisiones_registradas', empleadaId],
    queryFn: async () => {
      const r = await comisionesService.getComisionesRegistradas(empleadaId)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useLiquidarComision(empleadaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (registroId: string) => comisionesService.liquidarComision(registroId),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Comisión importada a la liquidación')
      qc.invalidateQueries({ queryKey: ['comisiones_registradas', empleadaId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones_empleadas', empleadaId] })
      qc.invalidateQueries({ queryKey: ['resumen_periodo'] })
    },
  })
}

// ── Horas ──────────────────────────────────────────────────────

export function useHorasPeriodo(empleadaId: string, periodoMes: number, periodoAnio: number) {
  return useQuery({
    queryKey: ['horas_periodo', empleadaId, periodoAnio, periodoMes],
    queryFn: async () => {
      const r = await comisionesService.getHorasPeriodo(empleadaId, periodoMes, periodoAnio)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useAgregarHoras(empleadaId: string, periodoMes: number, periodoAnio: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TRegistroHorasForm) => comisionesService.agregarHoras(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Horas registradas')
      qc.invalidateQueries({ queryKey: ['horas_periodo', empleadaId, periodoAnio, periodoMes] })
    },
  })
}

export function useEliminarHoras(empleadaId: string, periodoMes: number, periodoAnio: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => comisionesService.eliminarHoras(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Registro eliminado')
      qc.invalidateQueries({ queryKey: ['horas_periodo', empleadaId, periodoAnio, periodoMes] })
    },
  })
}

export function useCalcularHoras(empleadaId: string, periodoMes: number, periodoAnio: number) {
  return useQuery({
    queryKey: ['calcular_horas', empleadaId, periodoAnio, periodoMes],
    queryFn: async () => {
      const r = await comisionesService.calcularComisionHoras(empleadaId, periodoMes, periodoAnio)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

export function useCalcularProduccion(empleadaId: string, periodoMes: number, periodoAnio: number) {
  return useQuery({
    queryKey: ['calcular_produccion', empleadaId, periodoAnio, periodoMes],
    queryFn: async () => {
      const r = await comisionesService.calcularComisionProduccion(
        empleadaId,
        periodoMes,
        periodoAnio
      )
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!empleadaId,
  })
}

// ── Puntos por trabajo ─────────────────────────────────────────

export function usePuntosTrabajoConfig(clienteId?: string) {
  return useQuery({
    queryKey: ['puntos_trabajo_config', clienteId ?? 'all'],
    queryFn: async () => {
      const r = await comisionesService.getPuntosTrabajoConfig(clienteId)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useUpsertPuntosTrabajoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TPuntosTrabajoConfigForm) =>
      comisionesService.upsertPuntosTrabajoConfig(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['puntos_trabajo_config'] })
    },
  })
}

export function useDeletePuntosTrabajoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => comisionesService.deletePuntosTrabajoConfig(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Configuración eliminada')
      qc.invalidateQueries({ queryKey: ['puntos_trabajo_config'] })
    },
  })
}

// ── Valores de punto por tipo ──────────────────────────────────

export function useValoresPuntoTipo() {
  return useQuery({
    queryKey: ['valores_punto_tipo'],
    queryFn: async () => {
      const r = await comisionesService.getValoresPuntoTipo()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useUpsertValoresPuntoTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TValoresPuntoTipoForm) => comisionesService.upsertValoresPuntoTipo(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Valor guardado')
      qc.invalidateQueries({ queryKey: ['valores_punto_tipo'] })
      qc.invalidateQueries({ queryKey: ['preview_puntaje'] })
    },
  })
}

export function useDeleteValoresPuntoTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => comisionesService.deleteValoresPuntoTipo(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Valor eliminado')
      qc.invalidateQueries({ queryKey: ['valores_punto_tipo'] })
    },
  })
}
