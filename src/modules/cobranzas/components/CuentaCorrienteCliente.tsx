'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import {
  useCuentaCorrienteCliente,
  useLiquidacionesCliente,
  useRecibosCliente,
  useSaldoInicialCliente,
} from '../hooks/useCobranzas'
import { LiquidacionesCliente } from './LiquidacionesCliente'
import { NuevaLiquidacionForm } from './NuevaLiquidacionForm'
import { RegistrarReciboForm } from './RegistrarReciboForm'
import { RecibosCliente } from './RecibosCliente'
import { SaldoInicialForm } from './SaldoInicialForm'
import { CuentaCorrientePdfDocument } from './CuentaCorrientePdfDocument'
import {
  filtrarLiquidacionesPorFecha,
  filtrarRecibosPorFecha,
  nombreArchivoCuentaCorriente,
} from '../services/cuentaCorrientePdfService'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Modal } from '@/shared/components/Modal'
import { formatMoney } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import { Plus, Receipt, Download, Wallet } from 'lucide-react'

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
    <div className="border-border bg-surface rounded-md border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

export function CuentaCorrienteCliente({ clienteId }: Props) {
  const { data: cc, isLoading } = useCuentaCorrienteCliente(clienteId)
  const { data: liquidaciones } = useLiquidacionesCliente(clienteId)
  const { data: recibos } = useRecibosCliente(clienteId)
  const { data: saldoInicial } = useSaldoInicialCliente(clienteId)
  const { isAdmin } = useAuth()
  const [showLiqForm, setShowLiqForm] = useState(false)
  const [showSaldoInicial, setShowSaldoInicial] = useState(false)
  const [showReciboForm, setShowReciboForm] = useState(false)
  const [tab, setTab] = useState<Tab>('liquidaciones')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [generandoPdf, setGenerandoPdf] = useState(false)

  if (isLoading) return <Skeleton className="h-24 w-full" />

  const saldoFavor = cc?.saldo_a_favor ?? 0

  const handleDescargarPdf = async () => {
    if (!cc) return
    setGenerandoPdf(true)
    try {
      const liqFiltradas = filtrarLiquidacionesPorFecha(liquidaciones ?? [], desde, hasta)
      const recibosFiltrados = filtrarRecibosPorFecha(recibos ?? [], desde, hasta)
      const blob = await pdf(
        <CuentaCorrientePdfDocument
          clienteNombre={cc.cliente_nombre}
          cc={cc}
          liquidaciones={liqFiltradas}
          recibos={recibosFiltrados}
          desde={desde || undefined}
          hasta={hasta || undefined}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivoCuentaCorriente(cc.cliente_nombre)
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerandoPdf(false)
    }
  }

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
          <StatCard label="Liquidaciones pend." value={String(cc.liquidaciones_pendientes)} />
        </div>
      )}

      <div className="border-border bg-muted/20 flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="w-36">
          <Input
            label="Desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Input
            label="Hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDescargarPdf}
          disabled={generandoPdf || !cc}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {generandoPdf ? 'Generando...' : 'Descargar PDF'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="border-border bg-muted/30 flex gap-1 rounded-md border p-1">
          <button
            type="button"
            onClick={() => setTab('liquidaciones')}
            className={`rounded px-3 py-1 text-sm transition ${
              tab === 'liquidaciones'
                ? 'bg-surface text-foreground font-medium shadow-sm'
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
                ? 'bg-surface text-foreground font-medium shadow-sm'
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSaldoInicial(true)}
            >
              <Wallet className="mr-1.5 h-3.5 w-3.5" />
              {saldoInicial ? 'Editar saldo inicial' : 'Saldo inicial'}
            </Button>
          )}
          {isAdmin && (
            <Button type="button" size="sm" onClick={() => setShowLiqForm(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva liquidación
            </Button>
          )}
        </div>
      </div>

      {tab === 'liquidaciones' && (
        <LiquidacionesCliente
          clienteId={clienteId}
          desde={desde || undefined}
          hasta={hasta || undefined}
        />
      )}
      {tab === 'recibos' && (
        <RecibosCliente
          clienteId={clienteId}
          desde={desde || undefined}
          hasta={hasta || undefined}
        />
      )}

      {showLiqForm && (
        <Modal title="Nueva liquidación" onClose={() => setShowLiqForm(false)}>
          <NuevaLiquidacionForm
            clienteId={clienteId}
            onSuccess={() => setShowLiqForm(false)}
            onCancel={() => setShowLiqForm(false)}
          />
        </Modal>
      )}

      {showSaldoInicial && (
        <Modal
          title={saldoInicial ? 'Editar saldo inicial' : 'Cargar saldo inicial'}
          onClose={() => setShowSaldoInicial(false)}
        >
          <SaldoInicialForm
            clienteId={clienteId}
            onSuccess={() => setShowSaldoInicial(false)}
            onCancel={() => setShowSaldoInicial(false)}
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
