'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'

const PAGE_TITLES: Record<string, string> = {
  '/':              'Dashboard',
  '/clientes':      'Clientes',
  '/honorarios':    'Honorarios',
  '/cobranzas':     'Cobranzas',
  '/trabajos':      'Trabajos',
  '/configuracion': 'Configuración',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [key, val] of Object.entries(PAGE_TITLES)) {
    if (key !== '/' && pathname.startsWith(key)) return val
  }
  return ''
}

export function Header() {
  const pathname = usePathname()
  const { profile, rol } = useAuth()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
        {title}
      </span>
      <div className="flex items-center gap-3">
        {rol && (
          <span
            className="text-[9px] font-bold tracking-[0.18em] uppercase px-1.5 py-0.5"
            style={{
              background: rol === 'admin' ? 'oklch(0.685 0.148 83 / 0.15)' : 'oklch(0.944 0.008 80)',
              color: rol === 'admin' ? 'oklch(0.52 0.148 83)' : 'oklch(0.520 0.012 75)',
            }}
          >
            {rol}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">
          {profile?.nombre}
        </span>
      </div>
    </header>
  )
}
