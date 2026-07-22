import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fondosService } from '../services/fondosService'
import { chequesService } from '../services/chequesService'
import type { TEstadoCheque } from '../services/chequesService'
import type { TCheque } from '@/modules/cobranzas/types'
import { toast } from 'sonner'
import type { TFondoMovimientoForm } from '../schemas/fondoSchema'

export function useSaldoFondos() {
  return useQuery({
    queryKey: ['saldo_fondos'],
    queryFn: async () => {
      const r = await fondosService.getSaldo()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useMovimientosFondos(opts?: {
  desde?: string
  hasta?: string
  tipo?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ['fondos_movimientos', opts],
    queryFn: async () => {
      const r = await fondosService.getMovimientos(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useRegistrarMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TFondoMovimientoForm) => fondosService.registrar(form),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Movimiento registrado')
      qc.invalidateQueries({ queryKey: ['fondos_movimientos'] })
      qc.invalidateQueries({ queryKey: ['saldo_fondos'] })
    },
  })
}

export function useEliminarMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fondosService.eliminar(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Movimiento eliminado')
      qc.invalidateQueries({ queryKey: ['fondos_movimientos'] })
      qc.invalidateQueries({ queryKey: ['saldo_fondos'] })
    },
  })
}

export function useCheques(opts?: {
  estado?: TCheque['estado']
  origen?: TCheque['origen']
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ['cheques', opts],
    queryFn: async () => {
      const r = await chequesService.getAll(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

export function useActualizarEstadoCheque() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      estado,
      fecha_cobro,
    }: {
      id: string
      estado: TEstadoCheque
      fecha_cobro?: string
    }) => chequesService.actualizarEstado(id, estado, fecha_cobro),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Estado del cheque actualizado')
      qc.invalidateQueries({ queryKey: ['cheques'] })
      qc.invalidateQueries({ queryKey: ['saldo_fondos'] })
    },
  })
}

export function useConfirmarAcreditacionCheque() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => chequesService.confirmarAcreditacion(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Acreditación confirmada')
      qc.invalidateQueries({ queryKey: ['cheques'] })
    },
  })
}

export function useDesmarcarAcreditacionCheque() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => chequesService.desmarcarAcreditacion(id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success('Acreditación desmarcada')
      qc.invalidateQueries({ queryKey: ['cheques'] })
    },
  })
}
