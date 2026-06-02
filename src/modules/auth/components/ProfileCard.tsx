'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { useProfile } from '../hooks/useProfile'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'

export function ProfileCard() {
  const { isAdmin } = useAuth()
  const { data: profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{profile.nombre}</h2>
          <Badge variant={isAdmin ? 'default' : 'secondary'}>
            {isAdmin ? 'Administrador' : 'Empleada'}
          </Badge>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{profile.email}</p>
        </div>
      </div>
    </div>
  )
}
