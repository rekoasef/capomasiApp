'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { clientesService } from '../services/clientesService'
import { clavesService } from '../services/clavesService'
import type { TClienteForm } from '../schemas/clienteSchema'
import type { TClaveForm } from '../schemas/claveSchema'

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const result = await clientesService.getAll()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useClienteById(id: string) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: async () => {
      const result = await clientesService.getById(id)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!id,
  })
}

export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TClienteForm) => clientesService.create(form),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Cliente creado correctamente')
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useActualizarCliente(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TClienteForm) => clientesService.update(id, form),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Cliente actualizado')
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['clientes', id] })
    },
  })
}

export function useEliminarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clientesService.softDelete(id),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Cliente eliminado')
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useClavesCliente(clienteId: string) {
  return useQuery({
    queryKey: ['claves', clienteId],
    queryFn: async () => {
      const result = await clavesService.getByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useGuardarClave(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TClaveForm) => clavesService.upsert(clienteId, form),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Clave guardada')
      qc.invalidateQueries({ queryKey: ['claves', clienteId] })
    },
  })
}

export function useEliminarClave(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clavesService.delete(id),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Clave eliminada')
      qc.invalidateQueries({ queryKey: ['claves', clienteId] })
    },
  })
}
