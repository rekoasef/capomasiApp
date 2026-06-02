'use client'

import { useRouter } from 'next/navigation'
import { useAuthContext } from './AuthProvider'
import { authService } from '@/modules/auth/services/authService'

export function useAuth() {
  const { user, session, profile, rol, isLoading } = useAuthContext()
  const router = useRouter()

  async function signOut() {
    await authService.signOut()
    router.push('/login')
    router.refresh()
  }

  return {
    user,
    session,
    profile,
    rol,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: rol === 'admin',
    signOut,
  }
}
