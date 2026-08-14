import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notasEmpleadasService } from '../services/notasEmpleadasService'
import type { TNotasEmpleadaFilters } from '../types'
import { toast } from 'sonner'

export function useNotasEmpleadas(filtros?: TNotasEmpleadaFilters) {
  return useQuery({
    queryKey: ['notas-empleadas', filtros],
    queryFn: async () => {
      const result = await notasEmpleadasService.getAll(filtros)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useNotasEmpleadasByEmpleada(
  empleadaId: string | undefined,
  estado?: TNotasEmpleadaFilters['estado']
) {
  return useQuery({
    queryKey: ['notas-empleadas', 'empleada', empleadaId, estado],
    queryFn: async () => {
      if (!empleadaId) return []
      const result = await notasEmpleadasService.getByEmpleada(empleadaId, estado)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!empleadaId,
  })
}

export function useCrearNota() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notasEmpleadasService.create,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Nota creada')
      qc.invalidateQueries({ queryKey: ['notas-empleadas'] })
    },
  })
}

export function useEditarNota() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, contenido }: { id: string; contenido: string }) =>
      notasEmpleadasService.update(id, contenido),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Nota actualizada')
      qc.invalidateQueries({ queryKey: ['notas-empleadas'] })
    },
  })
}

export function useEliminarNota() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notasEmpleadasService.eliminar(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Nota eliminada')
      qc.invalidateQueries({ queryKey: ['notas-empleadas'] })
    },
  })
}

export function useFinalizarNota() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notasEmpleadasService.finalizar(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Nota marcada como finalizada')
      qc.invalidateQueries({ queryKey: ['notas-empleadas'] })
    },
  })
}
