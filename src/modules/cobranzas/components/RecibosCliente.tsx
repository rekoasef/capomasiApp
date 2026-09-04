'use client'

import { useState } from 'react'
import {
  useRecibosCliente,
  useAnularRecibo,
  useImputacionesRecibo,
  useEliminarImputacion,
} from '../hooks/useCobranzas'
import { filtrarRecibosPorFecha } from '../services/cuentaCorrientePdfService'
import { ImputarDesdeReciboModal } from './ImputarDesdeReciboModal'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TReciboDisponible } from '../types'
import { labelTipoServicio } from '@/shared/lib/etiquetas'

const TIPO_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  USD: 'USD',
  COMPENSACION: 'Compensación',
  SALDO_INICIAL: 'Saldo inicial a favor',
}

type Props = { clienteId: string; desde?: string; hasta?: string }

export function RecibosCliente({ clienteId, desde, hasta }: Props) {
  const { data: raw, isLoading, error } = useRecibosCliente(clienteId)
  const anular = useAnularRecibo(clienteId)
  const { isAdmin } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [anularId, setAnularId] = useState<string | null>(null)
  const [imputarRecibo, setImputarRecibo] = useState<TReciboDisponible | null>(null)

  const data = raw ? filtrarRecibosPorFecha(raw, desde, hasta) : raw

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-danger text-sm">{error.message}</p>
  if (!data?.length) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Sin recibos registrados{desde || hasta ? ' en el período seleccionado' : ''}
      </p>
    )
  }

  return (
    <>
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-border bg-muted/40 border-b">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                Fecha
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                N°
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                Tipo
              </th>
              <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Importe
              </th>
              <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Imputado
              </th>
              <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Saldo libre
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-border bg-surface divide-y">
            {data.map((rec) => {
              const expanded = expandedId === rec.id
              return (
                <RecibosRow
                  key={rec.id}
                  rec={rec}
                  expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : rec.id)}
                  onAnular={() => setAnularId(rec.id)}
                  onImputar={() => setImputarRecibo(rec)}
                  isAdmin={isAdmin}
                  clienteId={clienteId}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {imputarRecibo && (
        <ImputarDesdeReciboModal
          recibo={imputarRecibo}
          clienteId={clienteId}
          onClose={() => setImputarRecibo(null)}
        />
      )}

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
  rec: TReciboDisponible
  expanded: boolean
  onToggle: () => void
  onAnular: () => void
  onImputar: () => void
  isAdmin: boolean
  clienteId: string
}

function RecibosRow({
  rec,
  expanded,
  onToggle,
  onAnular,
  onImputar,
  isAdmin,
  clienteId,
}: RowProps) {
  const tipoLabel = rec.tipo_pago ? (TIPO_LABEL[rec.tipo_pago] ?? rec.tipo_pago) : '—'
  const saldoLibre = rec.saldo_libre ?? 0
  const totalImputado = rec.total_imputado ?? 0
  const importe = rec.importe ?? 0
  const anulado = rec.anulado === true

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="text-muted-foreground px-3 py-2">
          {rec.fecha ? formatDate(rec.fecha) : '—'}
        </td>
        <td className="text-muted-foreground px-3 py-2">{rec.numero_recibo ?? '—'}</td>
        <td className="px-3 py-2">
          <Badge variant="secondary">{tipoLabel}</Badge>
        </td>
        <td className="px-3 py-2 text-right font-medium">{formatMoney(importe)}</td>
        <td className="text-success px-3 py-2 text-right">
          {totalImputado > 0 ? (
            formatMoney(totalImputado)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {saldoLibre > 0 ? (
            <span className="text-warning font-semibold">{formatMoney(saldoLibre)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1">
            {saldoLibre > 0 && !anulado && (
              <Button type="button" size="sm" variant="outline" onClick={onImputar}>
                Imputar
              </Button>
            )}
            {isAdmin && !anulado && (
              <Button type="button" size="sm" variant="ghost" onClick={onAnular}>
                Anular
              </Button>
            )}
          </div>
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

  if (isLoading) return <p className="text-muted-foreground text-xs">Cargando imputaciones…</p>
  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-xs">
        Este recibo no tiene imputaciones — saldo disponible para imputar.
      </p>
    )
  }

  return (
    <>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground text-left">
            <th className="py-1 font-semibold">Liquidación</th>
            <th className="py-1 font-semibold">Fecha</th>
            <th className="py-1 text-right font-semibold">Importe imputado</th>
            <th className="py-1"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((imp) => (
            <tr key={imp.id} className="border-border/60 border-t">
              <td className="py-1">
                {labelTipoServicio(imp.tipo_servicio)}
                {imp.liquidacion_detalle ? ` — ${imp.liquidacion_detalle}` : ''}
              </td>
              <td className="text-muted-foreground py-1">
                {imp.fecha_liquidacion ? formatDate(imp.fecha_liquidacion) : '—'}
              </td>
              <td className="py-1 text-right font-medium">{formatMoney(imp.importe ?? 0)}</td>
              <td className="py-1 text-right">
                {canDelete && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => imp.id && setConfirmId(imp.id)}
                  >
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
