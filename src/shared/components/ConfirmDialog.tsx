'use client'

import { Button } from './ui/button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm border border-border bg-surface p-6 shadow-xl">
        <div className="mb-1 h-0.5 w-6 bg-danger" />
        <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
