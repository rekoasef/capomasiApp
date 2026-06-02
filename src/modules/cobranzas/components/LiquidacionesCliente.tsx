'use client'

import { useState } from 'react'
import { useLiquidacionesCliente, useAnularLiquidacion } from '../hooks/useCobranzas'
import {
  calcularSaldoPendiente,
  calcularTotalImputado,
  diasDesdeEmision,
  categorizarEdadDeuda,
} from '../services/calcularSaldo'
import { ImputarRecibosModal } from './ImputarRecibosModal'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import type { TLiquidacionConImputaciones } from '../types'

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIALMENTE_COBRADA: 'Parcial',
  COBRADA: 'Cobrada',
  ANULADA: 'Anulada',
}

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE: 'destructive',
  PARCIALMENTE_COBRADA: 'secondary',
  COBRADA: 'default',
  ANULADA: 'outline',
}

const EDAD_LABELS: Record<string, string> = {
  '0-30': '≤30 días',
  '31-60': '31-60 días',
  '61-90': '61-90 días',
  '90+': '+90 días',
}

type Props = { clienteId: string }

export function LiquidacionesCliente({ clienteId }: Props) {
  const { data, isLoading, error } = useLiquidacionesCliente(clienteId)
  const anular = useAnularLiquidacion(clienteId)
  const { isAdmin } = useAuth()

  const [imputarLiquidacion, setImputarLiquidacion] = useState<TLiquidacionConImputaciones | null>(null)
  const [anularId, setAnularId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-danger">{error.message}</p>
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">Sin liquidaciones registradas</p>

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo / Detalle</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Importe</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imputado</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Antigüedad</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {data.map((liq) => {
              const imputado = calcularTotalImputado(liq.imputaciones)
              const saldo = calcularSaldoPendiente(liq.importe_liquidado, liq.imputaciones)
              const dias = diasDesdeEmision(liq.fecha_liquidacion)
              const edad = categorizarEdadDeuda(dias)
              const pendiente = liq.estado !== 'COBRADA' && liq.estado !== 'ANULADA'

              return (
                <tr key={liq.id}>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(liq.fecha_liquidacion)}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{liq.tipo_servicio}</span>
                    {liq.detalle && <span className="ml-1 text-xs text-muted-foreground">— {liq.detalle}</span>}
                    {liq.periodo_mes && liq.periodo_anio && (
                      <span className="ml-1 text-xs text-muted-foreground">({liq.periodo_mes} {liq.periodo_anio})</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(liq.importe_liquidado)}</td>
                  <td className="px-3 py-2 text-right text-success">
                    {imputado > 0 ? formatMoney(imputado) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {pendiente ? (
                      <span className="font-semibold text-danger">{formatMoney(saldo)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={ESTADO_VARIANT[liq.estado]}>{ESTADO_LABELS[liq.estado]}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {pendiente ? (
                      <span className={`text-xs font-medium ${edad === '90+' ? 'text-danger' : edad === '61-90' ? 'text-warning' : 'text-muted-foreground'}`}>
                        {EDAD_LABELS[edad]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {pendiente && (
                        <Button type="button" size="sm" variant="outline" onClick={() => setImputarLiquidacion(liq)}>
                          Imputar
                        </Button>
                      )}
                      {isAdmin && liq.estado !== 'ANULADA' && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setAnularId(liq.id)}>
                          Anular
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {imputarLiquidacion && (
        <ImputarRecibosModal
          liquidacion={imputarLiquidacion}
          clienteId={clienteId}
          onClose={() => setImputarLiquidacion(null)}
        />
      )}

      <ConfirmDialog
        open={!!anularId}
        title="Anular liquidación"
        description="Esta acción no se puede deshacer. La liquidación quedará marcada como anulada."
        confirmLabel="Sí, anular"
        onConfirm={() => {
          if (anularId) anular.mutate(anularId)
          setAnularId(null)
        }}
        onCancel={() => setAnularId(null)}
        isPending={anular.isPending}
      />
    </>
  )
}
