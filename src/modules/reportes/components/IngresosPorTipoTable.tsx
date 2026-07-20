'use client'

import { useIngresosPorTipo } from '../hooks/useReportes'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_SERVICIO } from '@/shared/lib/parametros'
import { formatMoney } from '@/shared/utils/formatters'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
  mes?: number
}

export function IngresosPorTipoTable({ anio, mes }: Props) {
  const { data, isLoading } = useIngresosPorTipo(anio, mes)
  const { data: tipos = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })

  const labelDe = (codigo: string) => tipos.find((t) => t.value === codigo)?.label ?? codigo

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
        Sin ingresos registrados en {anio}
      </p>
    )
  }

  const totalAnio = data.reduce((sum, r) => sum + r.total_liquidado, 0)

  return (
    <div className="border-border bg-surface border">
      <table className="w-full text-sm">
        <thead className="border-border bg-muted/30 border-b">
          <tr>
            <th className="text-muted-foreground py-2 pr-4 pl-4 text-left text-[11px] font-semibold tracking-wide uppercase">
              Tipo de servicio
            </th>
            <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
              Ingresos (base)
            </th>
            <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
              % del total
            </th>
            <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
              Liquidaciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {data.map((r) => (
            <tr key={r.tipo_servicio} className="border-border border-b last:border-0">
              <td className="py-2 pr-4 pl-4 text-sm">{labelDe(r.tipo_servicio)}</td>
              <td className="py-2 pr-4 text-right text-sm font-medium tabular-nums">
                {formatMoney(r.total_liquidado)}
              </td>
              <td className="text-muted-foreground py-2 pr-4 text-right text-xs tabular-nums">
                {totalAnio > 0 ? `${((r.total_liquidado / totalAnio) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="text-muted-foreground py-2 pr-4 text-right text-xs tabular-nums">
                {r.cantidad}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
