'use client'

import { useQuery } from '@tanstack/react-query'
import { reportesService } from '../services/reportesService'

export function useAniosDisponibles() {
  return useQuery({
    queryKey: ['reportes', 'anios'],
    queryFn: async () => {
      const result = await reportesService.getAniosDisponibles()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useIngresosMensuales(anio?: number, mes?: number) {
  return useQuery({
    queryKey: ['reportes', 'ingresos-mensuales', anio, mes],
    queryFn: async () => {
      const result = await reportesService.getIngresosMensuales(anio, mes)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useIngresosPorTipo(anio?: number, mes?: number) {
  return useQuery({
    queryKey: ['reportes', 'ingresos-por-tipo', anio, mes],
    queryFn: async () => {
      const result = await reportesService.getIngresosPorTipo(anio, mes)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useIngresosPorEmpleada(anio?: number, mes?: number) {
  return useQuery({
    queryKey: ['reportes', 'ingresos-por-empleada', anio, mes],
    queryFn: async () => {
      const result = await reportesService.getIngresosPorEmpleada(anio, mes)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

export function useTrabajosAnualesCobrados(anio: number) {
  return useQuery({
    queryKey: ['reportes', 'trabajos-anuales-cobrados', anio],
    queryFn: async () => {
      const result = await reportesService.getTrabajosAnualesCobrados(anio)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!anio,
  })
}

export function useComparativoPeriodos(
  periodoA: { desde: string; hasta: string } | null,
  periodoB: { desde: string; hasta: string } | null
) {
  return useQuery({
    queryKey: ['reportes', 'comparativo', periodoA, periodoB],
    queryFn: async () => {
      if (!periodoA || !periodoB) throw new Error('Faltan períodos')
      const result = await reportesService.getComparativoPeriodos(periodoA, periodoB)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!periodoA && !!periodoB,
  })
}
