import { Skeleton } from './ui/skeleton'

export type Column<T> = {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  numeric?: boolean
}

type DataTableProps<T extends { id: string }> = {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyMessage = 'Sin datos',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center border border-border text-xs tracking-widest uppercase text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground ${col.numeric ? 'text-right' : ''} ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {data.map((row, i) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-muted/40' : ''} ${i % 2 === 1 ? 'bg-muted/20' : 'bg-surface'} transition-colors`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 ${col.numeric ? 'text-right tabular-nums' : ''} ${col.className ?? ''}`}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
