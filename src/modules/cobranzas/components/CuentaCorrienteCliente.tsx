'use client'

import { useState } from 'react'
import { useCuentaCorrienteCliente } from '../hooks/useCobranzas'
import { LiquidacionesCliente } from './LiquidacionesCliente'
import { NuevaLiquidacionForm } from './NuevaLiquidacionForm'
import { RegistrarReciboForm } from './RegistrarReciboForm'
import { RecibosCliente } from './RecibosCliente'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import { Plus, Receipt } from 'lucide-react'

type Props = { clienteId: string }
type Tab = 'liquidaciones' | 'recibos'

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: string
  variant?: 'default' | 'danger' | 'success' | 'warning'
}) {
  const color =
    variant === 'danger'
      ? 'text-danger'
      : variant === 'success'
        ? 'text-success'
        : variant === 'warning'
          ? 'text-warning'
          : 'text-foreground'
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

export function CuentaCorrienteCliente({ clienteId }: Props) {
  const { data: cc, isLoading } = useCuentaCorrienteCliente(clienteId)
  const { isAdmin } = useAuth()
  const [showLiqForm, setShowLiqForm] = useState(false)
  const [showReciboForm, setShowReciboForm] = useState(false)
  const [tab, setTab] = useState<Tab>('liquidaciones')

  if (isLoading) return <Skeleton className="h-24 w-full" />

  const saldoFavor = cc?.saldo_a_favor ?? 0

  return (
    <div className="space-y-6">
      {cc && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Devengado" value={formatMoney(cc.total_devengado)} />
          <StatCard label="Cobrado" value={formatMoney(cc.total_cobrado)} variant="success" />
          <StatCard
            label="Saldo pendiente"
            value={formatMoney(cc.saldo_pendiente)}
            variant={cc.saldo_pendiente > 0 ? 'danger' : 'default'}
          />
          <StatCard
            label="Saldo a favor"
            value={formatMoney(saldoFavor)}
            variant={saldoFavor > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Liquidaciones pend."
            value={String(cc.liquidaciones_pendientes)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setTab('liquidaciones')}
            className={`rounded px-3 py-1 text-sm transition ${
              tab === 'liquidaciones'
                ? 'bg-surface font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Liquidaciones
          </button>
          <button
            type="button"
            onClick={() => setTab('recibos')}
            className={`rounded px-3 py-1 text-sm transition ${
              tab === 'recibos'
                ? 'bg-surface font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Recibos
          </button>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowReciboForm(true)}>
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Nuevo recibo
          </Button>
          {isAdmin && (
            <Button type="button" size="sm" onClick={() => setShowLiqForm(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva liquidación
            </Button>
          )}
        </div>
      </div>

      {tab === 'liquidaciones' && <LiquidacionesCliente clienteId={clienteId} />}
      {tab === 'recibos' && <RecibosCliente clienteId={clienteId} />}

      {showLiqForm && (
        <Modal title="Nueva liquidación" onClose={() => setShowLiqForm(false)}>
          <NuevaLiquidacionForm
            clienteId={clienteId}
            onSuccess={() => setShowLiqForm(false)}
            onCancel={() => setShowLiqForm(false)}
          />
        </Modal>
      )}

      {showReciboForm && (
        <Modal title="Registrar recibo" onClose={() => setShowReciboForm(false)}>
          <RegistrarReciboForm
            clienteId={clienteId}
            onSuccess={() => setShowReciboForm(false)}
            onCancel={() => setShowReciboForm(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
