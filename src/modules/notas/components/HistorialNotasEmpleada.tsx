'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { useNotasEmpleadasByEmpleada } from '../hooks/useNotasEmpleadas'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate } from '@/shared/utils/formatters'
import { ChevronDown, ChevronUp, History } from 'lucide-react'

export function HistorialNotasEmpleada() {
  const { user } = useAuth()
  const { data: empleadas = [] } = useEmpleadas()
  const [abierto, setAbierto] = useState(false)

  const empleadaPropia = useMemo(
    () => empleadas.find((e) => e.usuario_id === user?.id),
    [empleadas, user?.id]
  )

  const { data: notas = [], isLoading } = useNotasEmpleadasByEmpleada(
    empleadaPropia?.id,
    'FINALIZADAS'
  )

  if (!empleadaPropia) return null

  return (
    <div className="border-border border">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide uppercase transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        Historial de notas finalizadas
        {!isLoading && <span className="text-foreground font-bold">({notas.length})</span>}
        {abierto ? (
          <ChevronUp className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        )}
      </button>

      {abierto &&
        (isLoading ? (
          <div className="border-border space-y-px border-t">
            <Skeleton className="h-14 w-full rounded-none" />
          </div>
        ) : !notas.length ? (
          <p className="text-muted-foreground border-border border-t px-4 py-6 text-center text-xs tracking-widest uppercase">
            Todavía no finalizaste ninguna nota
          </p>
        ) : (
          <div className="border-border divide-border divide-y border-t">
            {notas.map((n) => (
              <div key={n.id} className="bg-surface px-4 py-3 opacity-70">
                <p className="text-foreground text-sm whitespace-pre-wrap">{n.contenido}</p>
                <p className="text-muted-foreground text-[11px] tabular-nums">
                  {formatDate(n.created_at)}
                  {n.finalizada_at && ` · Finalizada ${formatDate(n.finalizada_at)}`}
                </p>
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}
