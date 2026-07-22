'use client'

import { Button } from './ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationControlsProps) {
  if (total <= pageSize) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  return (
    <div className="border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs">
      <span className="text-muted-foreground">
        Mostrando{' '}
        <span className="text-foreground font-semibold">
          {from}–{to}
        </span>{' '}
        de <span className="text-foreground font-semibold">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Anterior
        </Button>
        <span className="text-muted-foreground">
          Página {page + 1} de {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
