'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { liquidacionesService } from '../services/liquidacionesService'
import { recibosService } from '../services/recibosService'
import { imputacionesService } from '../services/imputacionesService'
import { cuentaCorrienteService } from '../services/cuentaCorrienteService'

// ----- Liquidaciones -----

export function useLiquidacionesCliente(clienteId: string) {
  return useQuery({
    queryKey: ['liquidaciones', 'cliente', clienteId],
    queryFn: async () => {
      const result = await liquidacionesService.getByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useUltimaLiquidacionCliente(
  clienteId: string,
  tipoServicio?: string,
) {
  return useQuery({
    queryKey: ['liquidaciones', 'ultima', clienteId, tipoServicio ?? null],
    queryFn: async () => {
      const result = await liquidacionesService.getUltimaByCliente(clienteId, tipoServicio)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId && !!tipoServicio,
    staleTime: 30 * 1000,
  })
}

export function useLiquidacionesPendientesCliente(clienteId: string) {
  return useQuery({
    queryKey: ['liquidaciones', 'pendientes', clienteId],
    queryFn: async () => {
      const result = await liquidacionesService.getPendientesByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useCrearLiquidacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ form }: { clienteId: string; form: unknown }) =>
      liquidacionesService.create(form),
    onSuccess: (result, { clienteId }) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Liquidación registrada')
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'pendientes', clienteId] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
    },
  })
}

export function useAnularLiquidacion(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => liquidacionesService.anular(id),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Liquidación anulada')
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'pendientes', clienteId] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
    },
  })
}

// ----- Recibos -----

export function useRecibosCliente(clienteId: string) {
  return useQuery({
    queryKey: ['recibos', 'cliente', clienteId],
    queryFn: async () => {
      const result = await recibosService.getByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useRecibosDisponiblesCliente(clienteId: string) {
  return useQuery({
    queryKey: ['recibos', 'disponibles', clienteId],
    queryFn: async () => {
      const result = await recibosService.getDisponiblesByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useRegistrarRecibo(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: unknown) => recibosService.registrar(form),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      const numeros = result.data
        .map((r) => r.numero_recibo)
        .filter((n): n is string => !!n)
      if (numeros.length === 0) {
        toast.success('Recibo registrado')
      } else if (numeros.length === 1) {
        toast.success(`Recibo ${numeros[0]} creado`)
      } else {
        toast.success(`Recibos creados: ${numeros.join(' y ')}`)
      }
      qc.invalidateQueries({ queryKey: ['recibos', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['recibos', 'disponibles', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'pendientes', clienteId] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
      qc.invalidateQueries({ queryKey: ['imputaciones'] })
    },
  })
}

export function useAnularRecibo(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      recibosService.anular(id, motivo),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Recibo anulado')
      qc.invalidateQueries({ queryKey: ['recibos', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['recibos', 'disponibles', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'pendientes', clienteId] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
      qc.invalidateQueries({ queryKey: ['imputaciones'] })
    },
  })
}

// ----- Imputaciones -----

export function useImputar(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: imputacionesService.imputar,
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Recibo imputado')
      qc.invalidateQueries({ queryKey: ['recibos', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['recibos', 'disponibles', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'pendientes', clienteId] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
      qc.invalidateQueries({ queryKey: ['imputaciones'] })
    },
  })
}

export function useEliminarImputacion(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => imputacionesService.eliminar(id),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Imputación eliminada')
      qc.invalidateQueries({ queryKey: ['recibos', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['recibos', 'disponibles', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['liquidaciones', 'pendientes', clienteId] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
      qc.invalidateQueries({ queryKey: ['imputaciones'] })
    },
  })
}

export function useImputacionesRecibo(reciboId: string) {
  return useQuery({
    queryKey: ['imputaciones', 'recibo', reciboId],
    queryFn: async () => {
      const result = await imputacionesService.getByRecibo(reciboId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!reciboId,
  })
}

// ----- Cuenta corriente -----

export function useCuentaCorrienteCliente(clienteId: string) {
  return useQuery({
    queryKey: ['cuenta-corriente', 'cliente', clienteId],
    queryFn: async () => {
      const result = await cuentaCorrienteService.getByCliente(clienteId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!clienteId,
  })
}

export function useSaldosDeudores() {
  return useQuery({
    queryKey: ['cuenta-corriente', 'deudores'],
    queryFn: async () => {
      const result = await cuentaCorrienteService.getDeudores()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCuentaCorrienteAll() {
  return useQuery({
    queryKey: ['cuenta-corriente', 'all'],
    queryFn: async () => {
      const result = await cuentaCorrienteService.getAll()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })
}
