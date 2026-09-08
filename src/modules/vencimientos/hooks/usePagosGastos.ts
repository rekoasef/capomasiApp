import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pagosGastosService } from '../services/pagosGastosService'
import type { TPagoGastoForm } from '../schemas/pagoGastoSchema'
import type { TPagosGastosFilters } from '../types'

export function useHistorialPagosGastos(
  filters?: TPagosGastosFilters & { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: ['pagos_gastos_historial', filters],
    queryFn: async () => {
      const r = await pagosGastosService.getHistorialPaginado(filters)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useResumenAnualGastos(
  anio: number,
  filters?: Omit<TPagosGastosFilters, 'anio' | 'mes'>
) {
  return useQuery({
    queryKey: ['pagos_gastos_resumen_anual', anio, filters],
    queryFn: async () => {
      const r = await pagosGastosService.getResumenAnual(anio, filters)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useRegistrarPagoGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TPagoGastoForm) => pagosGastosService.registrar(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Pago registrado')
      qc.invalidateQueries({ queryKey: ['pagos_gastos_historial'] })
      qc.invalidateQueries({ queryKey: ['pagos_gastos_resumen_anual'] })
      qc.invalidateQueries({ queryKey: ['gastos_recurrentes'] })
      qc.invalidateQueries({ queryKey: ['proximos_vencimientos'] })
    },
  })
}

export function useActualizarPagoGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: TPagoGastoForm }) =>
      pagosGastosService.update(id, form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Pago actualizado')
      qc.invalidateQueries({ queryKey: ['pagos_gastos_historial'] })
      qc.invalidateQueries({ queryKey: ['pagos_gastos_resumen_anual'] })
    },
  })
}

export function useEliminarPagoGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pagosGastosService.eliminar(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Pago eliminado')
      qc.invalidateQueries({ queryKey: ['pagos_gastos_historial'] })
      qc.invalidateQueries({ queryKey: ['pagos_gastos_resumen_anual'] })
      qc.invalidateQueries({ queryKey: ['gastos_recurrentes'] })
      qc.invalidateQueries({ queryKey: ['proximos_vencimientos'] })
    },
  })
}
