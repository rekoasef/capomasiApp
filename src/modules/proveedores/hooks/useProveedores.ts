import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proveedoresService } from '../services/proveedoresService'
import { toast } from 'sonner'
import type {
  TProveedorForm,
  TCompraProveedorForm,
  TPagoProveedorForm,
} from '../schemas/proveedorSchema'

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

export function useComprasProveedores(opts?: {
  proveedorId?: string
  estado?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ['compras_proveedores', opts],
    queryFn: async () => {
      const r = await proveedoresService.getCompras(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useCrearCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TCompraProveedorForm) => proveedoresService.crearCompra(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Compra registrada')
      qc.invalidateQueries({ queryKey: ['compras_proveedores'] })
      qc.invalidateQueries({ queryKey: ['cuenta_corriente_proveedores'] })
    },
  })
}

export function useAnularCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proveedoresService.anularCompra(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Compra anulada')
      qc.invalidateQueries({ queryKey: ['compras_proveedores'] })
      qc.invalidateQueries({ queryKey: ['cuenta_corriente_proveedores'] })
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

export function useCuentaCorrienteProveedores() {
  return useQuery({
    queryKey: ['cuenta_corriente_proveedores'],
    queryFn: async () => {
      const r = await proveedoresService.getCuentaCorriente()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useRegistrarPagoProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TPagoProveedorForm) => proveedoresService.registrarPago(form),
    onSuccess: (r, vars) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Pago registrado')
      qc.invalidateQueries({ queryKey: ['pagos_proveedores', vars.compra_id] })
      qc.invalidateQueries({ queryKey: ['compras_proveedores'] })
      qc.invalidateQueries({ queryKey: ['cuenta_corriente_proveedores'] })
    },
  })
}
