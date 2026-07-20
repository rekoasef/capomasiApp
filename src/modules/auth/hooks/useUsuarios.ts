'use client'

import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const result = await authService.getAll()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
