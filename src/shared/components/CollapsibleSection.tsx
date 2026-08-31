'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ title, description, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-border bg-surface border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="hover:bg-muted/20 flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors"
      >
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
        </div>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="border-border border-t px-6 py-4">{children}</div>}
    </div>
  )
}
