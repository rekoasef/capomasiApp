import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { categoriasGastosService } from '../services/categoriasGastosService'
import type { TCategoriaGastoForm } from '../schemas/categoriaGastoSchema'

export function useCategoriasGastos(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['categorias_gastos', opts],
    queryFn: async () => {
      const r = await categoriasGastosService.getAll(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useCrearCategoriaGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TCategoriaGastoForm) => categoriasGastosService.create(form),
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.error); return }
      toast.success('Categoría creada')
      qc.invalidateQueries({ queryKey: ['categorias_gastos'] })
    },
  })
}

export function useActualizarCategoriaGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<TCategoriaGastoForm> }) => categoriasGastosService.update(id, form),
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.error); return }
      toast.success('Categoría actualizada')
      qc.invalidateQueries({ queryKey: ['categorias_gastos'] })
      qc.invalidateQueries({ queryKey: ['proximos_vencimientos'] })
    },
  })
}

export function useEliminarCategoriaGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoriasGastosService.eliminar(id),
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.error); return }
      toast.success('Categoría eliminada')
      qc.invalidateQueries({ queryKey: ['categorias_gastos'] })
    },
  })
}
