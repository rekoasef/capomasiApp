'use client'

import Link from 'next/link'
import { useSaldosDeudores } from '../hooks/useCobranzas'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney } from '@/shared/utils/formatters'
import { calcularTotalesCuentaCorriente } from '../services/calcularSaldo'

export function SaldosDeudores() {
  const { data, isLoading, error } = useSaldosDeudores()

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  if (error) return <p className="text-danger text-sm">{error.message}</p>
  if (!data?.length)
    return <p className="text-muted-foreground py-8 text-center text-sm">Sin saldos deudores</p>

  const totales = calcularTotalesCuentaCorriente(data)

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-border bg-muted/40 border-b">
          <tr>
            <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
              Cliente
            </th>
            <th className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase">
              Devengado
            </th>
            <th className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase">
              Cobrado
            </th>
            <th className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase">
              Saldo
            </th>
            <th className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase">
              Pendientes
            </th>
          </tr>
        </thead>
        <tbody className="divide-border bg-surface divide-y">
          {data.map((cc) => (
            <tr key={cc.cliente_id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/clientes/${cc.cliente_id}`}
                  className="text-primary font-medium hover:underline"
                >
                  {cc.cliente_nombre}
                </Link>
              </td>
              <td className="px-4 py-3 text-right">{formatMoney(cc.total_devengado)}</td>
              <td className="px-4 py-3 text-right">{formatMoney(cc.total_cobrado)}</td>
              <td className="text-danger px-4 py-3 text-right font-semibold">
                {formatMoney(cc.saldo_pendiente)}
              </td>
              <td className="text-muted-foreground px-4 py-3 text-right">
                {cc.liquidaciones_pendientes}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-border bg-muted/40 border-t-2">
          <tr>
            <td className="text-muted-foreground px-4 py-3 text-xs font-semibold tracking-wide uppercase">
              Total ({data.length} {data.length === 1 ? 'cliente' : 'clientes'})
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              {formatMoney(totales.total_devengado)}
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              {formatMoney(totales.total_cobrado)}
            </td>
            <td className="text-danger px-4 py-3 text-right font-bold">
              {formatMoney(totales.saldo_pendiente)}
            </td>
            <td className="text-muted-foreground px-4 py-3 text-right font-semibold">
              {totales.liquidaciones_pendientes}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
