'use client'

import { useState } from 'react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { TrabajosRealizadosOverview } from '@/modules/empleadas/components/TrabajosRealizadosOverview'
import { ColaFacturacionOverview } from '@/modules/vencimientos/components/ColaFacturacionOverview'
import { TrabajosPendientesAprobacionView } from '@/modules/vencimientos/components/TrabajosPendientesAprobacionView'
import { TrabajosCompletadosView } from '@/modules/vencimientos/components/TrabajosCompletadosView'
import { MisVencimientosView } from '@/modules/vencimientos/components/MisVencimientosView'
import { useAuth } from '@/lib/auth/useAuth'
import {
  useColaFacturacionVencimientos,
  useTrabajosPendientesAprobacion,
} from '@/modules/vencimientos/hooks/useVencimientosFiscales'

type TabAdmin = 'planilla' | 'aprobar' | 'cola' | 'completados'

function AdminTrabajosPage() {
  const [tab, setTab] = useState<TabAdmin>('planilla')
  const { data: cola = [] } = useColaFacturacionVencimientos()
  const { data: aprobar = [] } = useTrabajosPendientesAprobacion()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trabajos"
        description="Planilla de trabajos, seguimiento anual y cola de facturación"
      />

      <div className="border-border flex gap-0 border-b">
        <button
          onClick={() => setTab('planilla')}
          className={`-mb-px border-b-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
            tab === 'planilla'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Planilla
        </button>
        <button
          onClick={() => setTab('aprobar')}
          className={`relative -mb-px border-b-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
            tab === 'aprobar'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Para Aprobar
          {aprobar.length > 0 && (
            <span className="bg-warning ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white tabular-nums">
              {aprobar.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('cola')}
          className={`relative -mb-px border-b-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
            tab === 'cola'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Cola de Facturación
          {cola.length > 0 && (
            <span className="bg-primary ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white tabular-nums">
              {cola.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('completados')}
          className={`-mb-px border-b-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
            tab === 'completados'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Completados
        </button>
      </div>

      {tab === 'planilla' && (
        <div className="border-border bg-surface border p-6">
          <TrabajosRealizadosOverview />
        </div>
      )}
      {tab === 'aprobar' && <TrabajosPendientesAprobacionView />}
      {tab === 'cola' && <ColaFacturacionOverview />}
      {tab === 'completados' && <TrabajosCompletadosView />}
    </div>
  )
}

export default function TrabajosPage() {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return null

  if (isAdmin) return <AdminTrabajosPage />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Trabajos"
        description="Obligaciones fiscales asignadas — actualizá el estado y agregá observaciones"
      />
      <MisVencimientosView />
    </div>
  )
}
