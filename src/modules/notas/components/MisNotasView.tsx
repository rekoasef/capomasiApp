'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { useNotasEmpleadasByEmpleada, useFinalizarNota } from '../hooks/useNotasEmpleadas'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate } from '@/shared/utils/formatters'
import { CheckCircle2 } from 'lucide-react'

export function MisNotasView() {
  const { user } = useAuth()
  const { data: empleadas = [] } = useEmpleadas()

  const empleadaPropia = useMemo(
    () => empleadas.find((e) => e.usuario_id === user?.id),
    [empleadas, user?.id]
  )

  const {
    data: notas = [],
    isLoading,
    error,
  } = useNotasEmpleadasByEmpleada(empleadaPropia?.id, 'ACTIVAS')
  const finalizar = useFinalizarNota()

  if (!empleadaPropia && !isLoading) {
    return (
      <div className="border-border bg-surface border p-6">
        <p className="text-sm font-semibold">Sin perfil de empleada</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Tu usuario no tiene un perfil de empleada asociado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !notas.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin notas pendientes
        </p>
      ) : (
        <div className="border-border divide-border divide-y border">
          {notas.map((n) => (
            <div key={n.id} className="bg-surface flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-foreground text-sm whitespace-pre-wrap">{n.contenido}</p>
                <p className="text-muted-foreground text-[11px] tabular-nums">
                  {formatDate(n.created_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={finalizar.isPending}
                onClick={() => finalizar.mutate(n.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Finalizar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
