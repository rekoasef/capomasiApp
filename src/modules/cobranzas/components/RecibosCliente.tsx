'use client'

import { useState } from 'react'
import {
  useRecibosCliente,
  useAnularRecibo,
  useImputacionesRecibo,
  useEliminarImputacion,
} from '../hooks/useCobranzas'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import { ChevronDown, ChevronRight } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  USD: 'USD',
}

type Props = { clienteId: string }

export function RecibosCliente({ clienteId }: Props) {
  const { data, isLoading, error } = useRecibosCliente(clienteId)
  const anular = useAnularRecibo(clienteId)
  const { isAdmin } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [anularId, setAnularId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-danger">{error.message}</p>
  if (!data?.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin recibos registrados</p>
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">N°</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Importe</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imputado</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo libre</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {data.map((rec) => {
              const expanded = expandedId === rec.id
              return (
                <RecibosRow
                  key={rec.id}
                  rec={rec}
                  expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : rec.id)}
                  onAnular={() => setAnularId(rec.id)}
                  isAdmin={isAdmin}
                  clienteId={clienteId}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!anularId}
        title="Anular recibo"
        description="Se revertirán todas las imputaciones del recibo y se eliminará su movimiento de fondos. Esta acción no se puede deshacer."
        confirmLabel="Sí, anular"
        onConfirm={() => {
          if (anularId) anular.mutate({ id: anularId })
          setAnularId(null)
        }}
        onCancel={() => setAnularId(null)}
        isPending={anular.isPending}
      />
    </>
  )
}

type RowProps = {
  rec: {
    id: string
    cliente_id: string | null
    numero_recibo: string | null
    fecha: string | null
    tipo_pago: string | null
    importe: number | null
    saldo_libre: number | null
    total_imputado: number | null
  }
  expanded: boolean
  onToggle: () => void
  onAnular: () => void
  isAdmin: boolean
  clienteId: string
}

function RecibosRow({ rec, expanded, onToggle, onAnular, isAdmin, clienteId }: RowProps) {
  const tipoLabel = rec.tipo_pago ? TIPO_LABEL[rec.tipo_pago] ?? rec.tipo_pago : '—'
  const saldoLibre = rec.saldo_libre ?? 0
  const totalImputado = rec.total_imputado ?? 0
  const importe = rec.importe ?? 0

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-2 py-2">
          <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-3 py-2 text-muted-foreground">{rec.fecha ? formatDate(rec.fecha) : '—'}</td>
        <td className="px-3 py-2 text-muted-foreground">{rec.numero_recibo ?? '—'}</td>
        <td className="px-3 py-2">
          <Badge variant="secondary">{tipoLabel}</Badge>
        </td>
        <td className="px-3 py-2 text-right font-medium">{formatMoney(importe)}</td>
        <td className="px-3 py-2 text-right text-success">
          {totalImputado > 0 ? formatMoney(totalImputado) : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-3 py-2 text-right">
          {saldoLibre > 0 ? (
            <span className="font-semibold text-warning">{formatMoney(saldoLibre)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {isAdmin && (
            <Button type="button" size="sm" variant="ghost" onClick={onAnular}>
              Anular
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10">
          <td colSpan={8} className="px-3 py-3">
            <RecibosImputaciones reciboId={rec.id} clienteId={clienteId} canDelete={isAdmin} />
          </td>
        </tr>
      )}
    </>
  )
}

function RecibosImputaciones({
  reciboId,
  clienteId,
  canDelete,
}: {
  reciboId: string
  clienteId: string
  canDelete: boolean
}) {
  const { data, isLoading } = useImputacionesRecibo(reciboId)
  const eliminar = useEliminarImputacion(clienteId)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (isLoading) return <p className="text-xs text-muted-foreground">Cargando imputaciones…</p>
  if (!data?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Este recibo no tiene imputaciones (saldo a favor disponible).
      </p>
    )
  }

  return (
    <>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 font-semibold">Liquidación</th>
            <th className="py-1 font-semibold">Fecha</th>
            <th className="py-1 text-right font-semibold">Importe imputado</th>
            <th className="py-1"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((imp) => (
            <tr key={imp.id} className="border-t border-border/60">
              <td className="py-1">
                {imp.tipo_servicio}
                {imp.liquidacion_detalle ? ` — ${imp.liquidacion_detalle}` : ''}
              </td>
              <td className="py-1 text-muted-foreground">
                {imp.fecha_liquidacion ? formatDate(imp.fecha_liquidacion) : '—'}
              </td>
              <td className="py-1 text-right font-medium">{formatMoney(imp.importe ?? 0)}</td>
              <td className="py-1 text-right">
                {canDelete && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => imp.id && setConfirmId(imp.id)}>
                    Quitar
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmId}
        title="Quitar imputación"
        description="La liquidación volverá a quedar pendiente por el monto imputado y el recibo recuperará el saldo libre."
        confirmLabel="Sí, quitar"
        onConfirm={() => {
          if (confirmId) eliminar.mutate(confirmId)
          setConfirmId(null)
        }}
        onCancel={() => setConfirmId(null)}
        isPending={eliminar.isPending}
      />
    </>
  )
}
