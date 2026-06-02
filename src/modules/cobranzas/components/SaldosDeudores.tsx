'use client'

import Link from 'next/link'
import { useSaldosDeudores } from '../hooks/useCobranzas'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney } from '@/shared/utils/formatters'

export function SaldosDeudores() {
  const { data, isLoading, error } = useSaldosDeudores()

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  if (error) return <p className="text-sm text-danger">{error.message}</p>
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">Sin saldos deudores</p>

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Devengado</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cobrado</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {data.map((cc) => (
            <tr key={cc.cliente_id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/clientes/${cc.cliente_id}`} className="font-medium text-primary hover:underline">
                  {cc.cliente_nombre}
                </Link>
              </td>
              <td className="px-4 py-3 text-right">{formatMoney(cc.total_devengado)}</td>
              <td className="px-4 py-3 text-right">{formatMoney(cc.total_cobrado)}</td>
              <td className="px-4 py-3 text-right font-semibold text-danger">{formatMoney(cc.saldo_pendiente)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">{cc.liquidaciones_pendientes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
