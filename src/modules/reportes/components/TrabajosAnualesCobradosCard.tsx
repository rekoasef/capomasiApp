'use client'

import { useTrabajosAnualesCobrados } from '../hooks/useReportes'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_SERVICIO } from '@/shared/lib/parametros'
import { formatMoney } from '@/shared/utils/formatters'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
}

export function TrabajosAnualesCobradosCard({ anio }: Props) {
  const { data, isLoading } = useTrabajosAnualesCobrados(anio)
  const { data: tipos = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })

  const labelDe = (codigo: string) => tipos.find((t) => t.value === codigo)?.label ?? codigo

  if (isLoading) return <Skeleton className="h-24 w-full" />

  if (!data?.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
        Sin trabajos anuales cobrados en {anio}
      </p>
    )
  }

  const total = data.reduce((sum, r) => sum + r.total_honorario, 0)

  return (
    <div className="border-border bg-surface border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          Trabajos anuales cobrados en {anio}
        </p>
        <p className="text-primary text-lg font-bold tabular-nums">{formatMoney(total)}</p>
      </div>
      <ul className="space-y-1.5">
        {data.map((r) => (
          <li key={r.tipo_trabajo} className="flex items-center justify-between text-sm">
            <span>{labelDe(r.tipo_trabajo)}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatMoney(r.total_honorario)} · {r.cantidad}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-3 text-[11px]">
        Este total no está incluido en los ingresos mensuales de arriba: los trabajos anuales
        (Balances, Ganancias, etc.) se registran aparte, en el módulo Trabajos.
      </p>
    </div>
  )
}
