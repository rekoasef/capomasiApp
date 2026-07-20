'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboardService'

export function useDashboardResumen() {
  return useQuery({
    queryKey: ['dashboard', 'resumen'],
    queryFn: async () => {
      const result = await dashboardService.getResumenAdmin()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useDashboardEmpleada(empleadaId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'empleada', empleadaId],
    queryFn: async () => {
      if (!empleadaId) throw new Error('Sin empleada')
      const result = await dashboardService.getResumenEmpleada(empleadaId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: !!empleadaId,
    staleTime: 5 * 60 * 1000,
  })
}
