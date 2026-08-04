import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vencimientosFiscalesService } from '../services/vencimientosFiscalesService'
import type { TVencimientosFiscalesFilters, TEstadoAvance } from '../types'
import { toast } from 'sonner'

export function useVencimientosFiscales(filtros?: TVencimientosFiscalesFilters) {
  return useQuery({
    queryKey: ['vencimientos-fiscales', filtros],
    queryFn: async () => {
      const result = await vencimientosFiscalesService.getAll(filtros)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useVencimientosFiscalesByEmpleada(
  empleadaId: string | undefined,
  filtros?: Omit<TVencimientosFiscalesFilters, 'empleadaId'>
) {
  return useQuery({
    queryKey: ['vencimientos-fiscales', 'empleada', empleadaId, filtros],
    queryFn: async () => {
      if (!empleadaId) return []
      const result = await vencimientosFiscalesService.getByEmpleada(empleadaId, filtros)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!empleadaId,
  })
}

export function useTrabajosPendientesAprobacion() {
  return useQuery({
    queryKey: ['vencimientos-fiscales', 'para-aprobar'],
    queryFn: async () => {
      const result = await vencimientosFiscalesService.getParaAprobar()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useColaFacturacionVencimientos() {
  return useQuery({
    queryKey: ['vencimientos-fiscales', 'cola-facturacion'],
    queryFn: async () => {
      const result = await vencimientosFiscalesService.getColaFacturacion()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useTrabajosCompletados(filtros?: {
  clienteId?: string
  empleadaId?: string
  tipoVencimiento?: string
  facturacion?: 'FACTURADO' | 'FALTA_FACTURAR' | 'ABONO'
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ['vencimientos-fiscales', 'completados', filtros],
    queryFn: async () => {
      const result = await vencimientosFiscalesService.getCompletados(filtros)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useAprobarTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vencimientosFiscalesService.aprobar(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const v = result.data
      const tienePuntos = v.empleada_id && v.puntos_snapshot && v.puntos_snapshot > 0
      const sufijo = v.facturar_aparte
        ? ' · pasó a cola de facturación'
        : ' · incluido en el abono, no va a cola'
      toast.success(
        tienePuntos
          ? `Trabajo aprobado — ${v.puntos_snapshot} pts registrados${sufijo}`
          : `Trabajo aprobado${sufijo}`
      )
      qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
    },
  })
}

export function useCrearVencimientoFiscal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vencimientosFiscalesService.create,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Vencimiento creado')
      qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
    },
  })
}

export function useActualizarEstadoAvance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      estadoAvance,
      observaciones,
    }: {
      id: string
      estadoAvance: TEstadoAvance
      observaciones?: string
    }) => vencimientosFiscalesService.actualizarEstadoAvance(id, estadoAvance, observaciones),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Estado actualizado')
      qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
    },
  })
}

export function useMarcarTerminado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, observaciones }: { id: string; observaciones?: string }) =>
      vencimientosFiscalesService.marcarTerminado(id, observaciones),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Trabajo marcado como terminado')
      qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
    },
  })
}

export function useEliminarVencimientoFiscal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vencimientosFiscalesService.eliminar(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Vencimiento eliminado')
      qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
    },
  })
}

export function useGenerarVencimientosMes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ anio, mes }: { anio: number; mes: number }) =>
      vencimientosFiscalesService.generarDesdeConfig(anio, mes),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      // Solo notifica si se crearon vencimientos nuevos — el caso 0 es silencioso
      if (result.data.creados > 0) {
        toast.success(
          `${result.data.creados} vencimiento${result.data.creados !== 1 ? 's' : ''} generado${result.data.creados !== 1 ? 's' : ''}`
        )
        qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
      }
    },
  })
}
