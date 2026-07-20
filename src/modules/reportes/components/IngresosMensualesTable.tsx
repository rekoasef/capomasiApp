'use client'

import { useIngresosMensuales } from '../hooks/useReportes'
import { formatMoney } from '@/shared/utils/formatters'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
  mes?: number
}

export function IngresosMensualesTable({ anio, mes }: Props) {
  const { data, isLoading } = useIngresosMensuales(anio, mes)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
        Sin liquidaciones registradas en {anio}
      </p>
    )
  }

  const totalLiquidado = data.reduce((sum, r) => sum + r.total_liquidado, 0)
  const totalFacturado = data.reduce((sum, r) => sum + r.total_facturado, 0)

  return (
    <div className="border-border bg-surface border">
      <table className="w-full text-sm">
        <thead className="border-border bg-muted/30 border-b">
          <tr>
            <th className="text-muted-foreground py-2 pr-4 pl-4 text-left text-[11px] font-semibold tracking-wide uppercase">
              Mes
            </th>
            <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
              Ingresos (base)
            </th>
            <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
              Facturado c/IVA
            </th>
            <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
              Liquidaciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {data.map((mes) => (
            <tr key={mes.mes} className="border-border border-b last:border-0">
              <td className="py-2 pr-4 pl-4 text-sm capitalize">
                {new Date(mes.mes + 'T12:00:00').toLocaleDateString('es-AR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </td>
              <td className="py-2 pr-4 text-right text-sm font-medium tabular-nums">
                {formatMoney(mes.total_liquidado)}
              </td>
              <td className="text-muted-foreground py-2 pr-4 text-right text-sm tabular-nums">
                {mes.total_facturado !== mes.total_liquidado ? (
                  formatMoney(mes.total_facturado)
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="text-muted-foreground py-2 pr-4 text-right text-xs tabular-nums">
                {mes.cantidad_liquidaciones}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-border bg-muted/20 border-t-2 font-semibold">
            <td className="py-2 pr-4 pl-4 text-sm">Total {anio}</td>
            <td className="py-2 pr-4 text-right text-sm tabular-nums">
              {formatMoney(totalLiquidado)}
            </td>
            <td className="text-muted-foreground py-2 pr-4 text-right text-sm tabular-nums">
              {formatMoney(totalFacturado)}
            </td>
            <td className="text-muted-foreground py-2 pr-4 text-right text-xs tabular-nums">
              {data.reduce((sum, r) => sum + r.cantidad_liquidaciones, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
