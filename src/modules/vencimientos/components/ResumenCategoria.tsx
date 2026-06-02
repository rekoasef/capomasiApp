'use client'

import { formatMoney } from '@/shared/utils/formatters'
import type { TResumenCategoria } from '../types'

interface ResumenCategoriaProps {
  items: TResumenCategoria[]
}

export function ResumenCategoria({ items }: ResumenCategoriaProps) {
  if (!items.length) return null

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.slice(0, 4).map((item) => (
        <div key={item.categoria_id} className="border border-border bg-surface px-3 py-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2" style={{ backgroundColor: item.categoria_color ?? 'var(--muted-foreground)' }} />
            <span className="truncate text-xs font-semibold text-muted-foreground">{item.categoria_nombre}</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{formatMoney(item.total)}</p>
          <p className="text-[11px] text-muted-foreground">{item.cantidad} pagos</p>
        </div>
      ))}
    </div>
  )
}
