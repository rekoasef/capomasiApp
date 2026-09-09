import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proveedoresService } from '../services/proveedoresService'
import { toast } from 'sonner'
import type { TProveedorForm, TGastoProveedorForm } from '../schemas/proveedorSchema'

export function useProveedores() {
  return useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const r = await proveedoresService.getAll()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useCrearProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TProveedorForm) => proveedoresService.create(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Proveedor creado')
      qc.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

export function useEliminarProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proveedoresService.softDelete(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Proveedor eliminado')
      qc.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

export function useComprasProveedores(
  opts?: {
    proveedorId?: string
    estado?: string
    page?: number
    pageSize?: number
  },
  queryOpts?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['compras_proveedores', opts],
    queryFn: async () => {
      const r = await proveedoresService.getCompras(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: queryOpts?.enabled,
  })
}

export function useCrearGastoPagado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TGastoProveedorForm) => proveedoresService.crearGastoPagado(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Gasto registrado')
      qc.invalidateQueries({ queryKey: ['compras_proveedores'] })
      qc.invalidateQueries({ queryKey: ['historial_egresos_estudio'] })
    },
  })
}

export function useEliminarCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proveedoresService.eliminarCompra(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Gasto eliminado')
      qc.invalidateQueries({ queryKey: ['compras_proveedores'] })
      qc.invalidateQueries({ queryKey: ['historial_egresos_estudio'] })
      // El borrado revierte el pago y puede devolver un cheque a cartera.
      qc.invalidateQueries({ queryKey: ['fondos'] })
      qc.invalidateQueries({ queryKey: ['cheques'] })
    },
  })
}

export function usePagosProveedor(compraId: string) {
  return useQuery({
    queryKey: ['pagos_proveedores', compraId],
    queryFn: async () => {
      const r = await proveedoresService.getPagos(compraId)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
    enabled: !!compraId,
  })
}

export function useHistorialEgresos() {
  return useQuery({
    queryKey: ['historial_egresos_estudio'],
    queryFn: async () => {
      const r = await proveedoresService.getHistorialEgresos()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}
