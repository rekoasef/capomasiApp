'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTrabajosAll } from '../hooks/useTrabajos'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney } from '@/shared/utils/formatters'
import { ESTADO_LABEL } from '../types'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE:  'outline',
  EN_PROCESO: 'secondary',
  FINALIZADO: 'default',
  COBRADO:    'default',
}

const ANIOS_DISPONIBLES = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

export function TrabajosOverview() {
  const [anioFiltro, setAnioFiltro] = useState<number>(new Date().getFullYear())
  const { data, isLoading, error } = useTrabajosAll(anioFiltro)

  const resumen = data?.reduce(
    (acc, t) => {
      acc[t.estado] = (acc[t.estado] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  ) ?? {}

  return (
    <div className="space-y-6">
      {/* Filtro año */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Año</span>
        <div className="flex gap-1">
          {ANIOS_DISPONIBLES.map((a) => (
            <button
              key={a}
              onClick={() => setAnioFiltro(a)}
              className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                a === anioFiltro
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen por estado */}
      {!isLoading && data && (
        <div className="grid grid-cols-4 gap-2">
          {(['PENDIENTE', 'EN_PROCESO', 'FINALIZADO', 'COBRADO'] as const).map((e) => (
            <div key={e} className="border border-border p-3">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{ESTADO_LABEL[e]}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{resumen[e] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-px">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : !data?.length ? (
        <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin trabajos para {anioFiltro}</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Cliente</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Honorario</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {data.map((t, i) => (
                <tr key={t.id} className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/clientes/${t.cliente_id}`} className="font-medium text-primary hover:underline">
                      {t.clientes?.nombre ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.tipo_trabajo.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {t.honorario ? formatMoney(t.honorario) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={ESTADO_VARIANT[t.estado]}>{ESTADO_LABEL[t.estado]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
