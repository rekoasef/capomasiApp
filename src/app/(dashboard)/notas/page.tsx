'use client'

import { PageHeader } from '@/shared/components/layout/PageHeader'
import { NotasAdminOverview } from '@/modules/notas/components/NotasAdminOverview'
import { MisNotasView } from '@/modules/notas/components/MisNotasView'
import { HistorialNotasEmpleada } from '@/modules/notas/components/HistorialNotasEmpleada'
import { useAuth } from '@/lib/auth/useAuth'

export default function NotasPage() {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return null

  if (isAdmin) return <NotasAdminOverview />

  return (
    <div className="space-y-6">
      <PageHeader title="Mis Notas" description="Notas asignadas por Paola" />
      <MisNotasView />
      <HistorialNotasEmpleada />
    </div>
  )
}
