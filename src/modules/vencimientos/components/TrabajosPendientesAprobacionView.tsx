'use client'

import {
  useTrabajosPendientesAprobacion,
  useAprobarTrabajo,
} from '../hooks/useVencimientosFiscales'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { formatDate } from '@/shared/utils/formatters'
import { CheckCircle2, Clock } from 'lucide-react'

const HOY = new Date()

export function TrabajosPendientesAprobacionView() {
  const { data = [], isLoading, error } = useTrabajosPendientesAprobacion()
  const aprobar = useAprobarTrabajo()

  if (isLoading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-danger text-sm">{error.message}</p>

  if (!data.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <CheckCircle2 className="text-success h-8 w-8" />
        <p className="text-sm font-semibold">Sin trabajos para aprobar</p>
        <p className="text-muted-foreground text-xs">
          Cuando una empleada marque un trabajo como terminado, aparece acá para tu aprobación.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-xs">
        {data.length} trabajo{data.length !== 1 ? 's' : ''} terminado{data.length !== 1 ? 's' : ''}{' '}
        esperando aprobación
      </p>

      <div className="border-border divide-border divide-y border">
        {data.map((v) => {
          const esVencido = v.fecha_vencimiento < HOY.toISOString().slice(0, 10)
          return (
            <div
              key={v.id}
              className="bg-surface hover:bg-muted/20 flex items-center gap-4 px-4 py-3 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{v.clientes?.nombre ?? '—'}</span>
                  <span className="text-muted-foreground text-xs">{v.descripcion}</span>
                  {v.empleadas && (
                    <span className="border-border text-muted-foreground border px-1.5 py-0.5 text-[10px]">
                      {v.empleadas.nombre}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] tabular-nums ${esVencido ? 'text-danger font-medium' : 'text-muted-foreground'}`}
                  >
                    {esVencido && <Clock className="-mt-px mr-0.5 inline h-3 w-3" />}
                    {formatDate(v.fecha_vencimiento)}
                  </span>
                  {v.observaciones_empleada && (
                    <span className="text-muted-foreground max-w-sm truncate text-[11px] italic">
                      &quot;{v.observaciones_empleada}&quot;
                    </span>
                  )}
                </div>
              </div>

              <Button size="sm" disabled={aprobar.isPending} onClick={() => aprobar.mutate(v.id)}>
                Aprobar
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
