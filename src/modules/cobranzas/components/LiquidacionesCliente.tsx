'use client'

import { useState } from 'react'
import { useLiquidacionesCliente, useAnularLiquidacion } from '../hooks/useCobranzas'
import {
  calcularSaldoPendiente,
  calcularTotalImputado,
  diasDesdeEmision,
  categorizarEdadDeuda,
} from '../services/calcularSaldo'
import { filtrarLiquidacionesPorFecha } from '../services/cuentaCorrientePdfService'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'

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

type Props = { clienteId: string; desde?: string; hasta?: string }

export function LiquidacionesCliente({ clienteId, desde, hasta }: Props) {
  const { data: raw, isLoading, error } = useLiquidacionesCliente(clienteId)
  const anular = useAnularLiquidacion(clienteId)
  const { isAdmin } = useAuth()

  const [anularId, setAnularId] = useState<string | null>(null)

  const data = raw ? filtrarLiquidacionesPorFecha(raw, desde, hasta) : raw

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-danger text-sm">{error.message}</p>
  if (!data?.length)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Sin liquidaciones registradas{desde || hasta ? ' en el período seleccionado' : ''}
      </p>
    )

  return (
    <>
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-border bg-muted/40 border-b">
            <tr>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                Fecha
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                Tipo / Detalle
              </th>
              <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Importe
              </th>
              <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Imputado
              </th>
              <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                Saldo
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                Estado
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                Antigüedad
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-border bg-surface divide-y">
            {data.map((liq) => {
              const imputado = calcularTotalImputado(liq.imputaciones)
              const saldo = calcularSaldoPendiente(
                liq.importe_liquidado,
                liq.imputaciones,
                liq.importe_facturado
              )
              const dias = diasDesdeEmision(liq.fecha_liquidacion)
              const edad = categorizarEdadDeuda(dias)
              const pendiente = liq.estado !== 'COBRADA' && liq.estado !== 'ANULADA'

              const importeCliente = liq.importe_facturado ?? liq.importe_liquidado
              const tieneIva =
                liq.importe_facturado != null && liq.importe_facturado !== liq.importe_liquidado

              return (
                <tr key={liq.id}>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatDate(liq.fecha_liquidacion)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{liq.tipo_servicio}</span>
                    {liq.tipo_comprobante && (
                      <span className="text-muted-foreground ml-1.5 text-[10px] font-medium tracking-wide">
                        {liq.tipo_comprobante.replace('_', ' ')}
                      </span>
                    )}
                    {liq.detalle && (
                      <span className="text-muted-foreground ml-1 text-xs">— {liq.detalle}</span>
                    )}
                    {liq.periodo_mes && liq.periodo_anio && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({liq.periodo_mes} {liq.periodo_anio})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-medium">{formatMoney(importeCliente)}</span>
                    {tieneIva && (
                      <div className="text-muted-foreground text-[10px]">
                        base {formatMoney(liq.importe_liquidado)}
                      </div>
                    )}
                  </td>
                  <td className="text-success px-3 py-2 text-right">
                    {imputado > 0 ? (
                      formatMoney(imputado)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {pendiente ? (
                      <span className="text-danger font-semibold">{formatMoney(saldo)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={ESTADO_VARIANT[liq.estado]}>{ESTADO_LABELS[liq.estado]}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {pendiente ? (
                      <span
                        className={`text-xs font-medium ${edad === '90+' ? 'text-danger' : edad === '61-90' ? 'text-warning' : 'text-muted-foreground'}`}
                      >
                        {EDAD_LABELS[edad]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {isAdmin && liq.estado !== 'ANULADA' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAnularId(liq.id)}
                        >
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
