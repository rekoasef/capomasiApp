'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { useAuth } from '@/lib/auth/useAuth'
import { CategoriasManager } from './CategoriasManager'
import { GastosRecurrentesPanel } from './GastosRecurrentesPanel'
import { HistorialPagos } from './HistorialPagos'
import { ProximosVencimientosPanel } from './ProximosVencimientosPanel'
import { RegistrarPagoForm } from './RegistrarPagoForm'
import type { TProximoVencimiento } from '../types'
import { Plus } from 'lucide-react'

type Tab = 'proximos' | 'historial' | 'recurrentes' | 'categorias'

const TABS: { id: Tab; label: string }[] = [
  { id: 'proximos',    label: 'Próximos' },
  { id: 'historial',   label: 'Historial' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'categorias',  label: 'Categorías' },
]

export function GastosPaolaOverview() {
  const { isAdmin, isLoading } = useAuth()
  const [tab, setTab] = useState<Tab>('proximos')
  const [showPagoUnico, setShowPagoUnico] = useState(false)
  const [pagarVencimiento, setPagarVencimiento] = useState<TProximoVencimiento | null>(null)

  if (isLoading) return null

  if (!isAdmin) {
    return (
      <div className="border border-border bg-surface p-6">
        <p className="text-sm font-semibold">Acceso restringido</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowPagoUnico(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Añadir pago
        </Button>
      </div>

      {tab === 'proximos' && <ProximosVencimientosPanel onPagar={setPagarVencimiento} />}
      {tab === 'historial' && <HistorialPagos />}
      {tab === 'recurrentes' && <GastosRecurrentesPanel />}
      {tab === 'categorias' && <CategoriasManager />}

      {(showPagoUnico || pagarVencimiento) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={() => { setShowPagoUnico(false); setPagarVencimiento(null) }} />
          <div className="relative z-10 w-full max-w-md border border-border bg-surface p-5 shadow-xl">
            <h2 className="mb-4 text-sm font-bold">{pagarVencimiento ? 'Registrar pago' : 'Añadir pago'}</h2>
            <RegistrarPagoForm
              vencimiento={pagarVencimiento ?? undefined}
              onCancel={() => { setShowPagoUnico(false); setPagarVencimiento(null) }}
              onSaved={() => { setShowPagoUnico(false); setPagarVencimiento(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
