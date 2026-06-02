'use client'

import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'
import { useAuth } from '@/lib/auth/useAuth'

export function useProfile() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const result = await authService.getProfile()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}
