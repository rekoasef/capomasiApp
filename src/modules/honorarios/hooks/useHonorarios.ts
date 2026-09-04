'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { honorariosService } from '../services/honorariosService'
import { mesesDesdeAjuste, estaVencidoAjuste } from '../services/calcularNuevoHonorario'

export function useHonorarioActivo(clienteId: string) {
  return useQuery({
    queryKey: ['honorarios', 'activo', clienteId],
    queryFn: async () => {
      const result = await honorariosService.getActivoByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useHistorialHonorarios(clienteId: string) {
  return useQuery({
    queryKey: ['honorarios', 'historial', clienteId],
    queryFn: async () => {
      const result = await honorariosService.getHistorial(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useHonorariosConAjustePendiente() {
  return useQuery({
    queryKey: ['honorarios', 'activos'],
    queryFn: async () => {
      const result = await honorariosService.getAllActivos()
      if (!result.ok) throw new Error(result.error)
      return result.data
        .map((h) => ({
          honorario: h,
          mesesTranscurridos: mesesDesdeAjuste(h.vigente_desde),
        }))
        .filter(({ honorario, mesesTranscurridos }) =>
          estaVencidoAjuste(mesesTranscurridos, honorario.frecuencia_ajuste_meses)
        )
        .sort((a, b) => b.mesesTranscurridos - a.mesesTranscurridos)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetHonorarioInicial(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      monto,
      frecuencia,
      notas,
    }: {
      monto: number
      frecuencia: number
      notas?: string
    }) => honorariosService.setInicial(clienteId, monto, frecuencia, notas),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Honorario registrado')
      qc.invalidateQueries({ queryKey: ['honorarios'] })
    },
  })
}

export function useEditarHonorarioManual(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      monto,
      observacion,
      frecuencia,
    }: {
      monto: number
      observacion: string
      frecuencia?: number
    }) => honorariosService.editarManual(clienteId, monto, observacion, frecuencia),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Honorario modificado')
      qc.invalidateQueries({ queryKey: ['honorarios'] })
    },
  })
}

export function useAplicarAjuste(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ porcentaje, notas }: { porcentaje: number; notas?: string }) =>
      honorariosService.aplicarAjuste(clienteId, porcentaje, notas),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Ajuste aplicado correctamente')
      qc.invalidateQueries({ queryKey: ['honorarios'] })
    },
  })
}
