'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { trabajosService } from '../services/trabajosService'

export function useTrabajosCliente(clienteId: string) {
  return useQuery({
    queryKey: ['trabajos', 'cliente', clienteId],
    queryFn: async () => {
      const result = await trabajosService.getByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useTrabajosAll(anio?: number) {
  return useQuery({
    queryKey: ['trabajos', 'all', anio ?? 'todos'],
    queryFn: async () => {
      const result = await trabajosService.getAll(anio)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useTrabajosPendientes() {
  return useQuery({
    queryKey: ['trabajos', 'pendientes'],
    queryFn: async () => {
      const result = await trabajosService.getPendientes()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCrearTrabajo(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: unknown) => trabajosService.create(form),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Trabajo registrado')
      qc.invalidateQueries({ queryKey: ['trabajos'] })
    },
  })
}

export function useAvanzarEstado(clienteId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, honorario, notas }: { id: string; honorario?: number; notas?: string }) =>
      trabajosService.avanzarEstado(id, honorario, notas),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Estado actualizado')
      qc.invalidateQueries({ queryKey: ['trabajos'] })
    },
  })
}

export function useRetrocederEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trabajosService.retrocederEstado(id),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Estado revertido')
      qc.invalidateQueries({ queryKey: ['trabajos'] })
    },
  })
}

export function useEliminarTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trabajosService.eliminar(id),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Trabajo eliminado')
      qc.invalidateQueries({ queryKey: ['trabajos'] })
    },
  })
}
