import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gastosRecurrentesService } from '../services/gastosRecurrentesService'
import type { TGastoRecurrenteForm } from '../schemas/gastoRecurrenteSchema'

export function useGastosRecurrentes(opts?: { includeInactive?: boolean; categoriaId?: string }) {
  return useQuery({
    queryKey: ['gastos_recurrentes', opts],
    queryFn: async () => {
      const r = await gastosRecurrentesService.getAll(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useProximosVencimientos(dias?: number) {
  return useQuery({
    queryKey: ['proximos_vencimientos', dias],
    queryFn: async () => {
      const r = await gastosRecurrentesService.getProximos(dias)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useCrearGastoRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TGastoRecurrenteForm) => gastosRecurrentesService.create(form),
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.error); return }
      toast.success('Gasto recurrente creado')
      qc.invalidateQueries({ queryKey: ['gastos_recurrentes'] })
      qc.invalidateQueries({ queryKey: ['proximos_vencimientos'] })
    },
  })
}

export function useActualizarGastoRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<TGastoRecurrenteForm> }) => gastosRecurrentesService.update(id, form),
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.error); return }
      toast.success('Gasto recurrente actualizado')
      qc.invalidateQueries({ queryKey: ['gastos_recurrentes'] })
      qc.invalidateQueries({ queryKey: ['proximos_vencimientos'] })
    },
  })
}
