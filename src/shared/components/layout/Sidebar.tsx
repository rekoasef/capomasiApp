'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import {
  LayoutGrid,
  Users,
  TrendingUp,
  Receipt,
  Briefcase,
  CalendarClock,
  UserCog,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',               label: 'Dashboard',     icon: LayoutGrid },
  { href: '/clientes',       label: 'Clientes',       icon: Users      },
  { href: '/honorarios',     label: 'Honorarios',     icon: TrendingUp },
  { href: '/cobranzas',      label: 'Cobranzas',      icon: Receipt    },
  { href: '/trabajos',       label: 'Trabajos',       icon: Briefcase  },
  { href: '/empleadas',      label: 'Empleadas',      icon: UserCog,       adminOnly: true },
  { href: '/vencimientos',   label: 'Vencimientos',   icon: CalendarClock, adminOnly: true },
  { href: '/configuracion',  label: 'Configuración',  icon: Settings   },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, profile, isAdmin } = useAuth()
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
      className="flex h-full w-52 shrink-0 flex-col"
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0"
            style={{ background: 'var(--sidebar-accent)' }}
          />
          <span
            className="text-xs font-bold tracking-[0.18em] uppercase"
            style={{ color: 'oklch(0.88 0.008 65)' }}
          >
            Capomasi
          </span>
        </div>
        <p
          className="mt-1 pl-4 text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--sidebar-foreground)' }}
        >
          Estudio Contable
        </p>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--sidebar-border)' }} className="mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-0 py-4 space-y-0.5">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-5 py-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors',
                'border-l-2',
                isActive
                  ? 'border-[var(--sidebar-accent)] text-[var(--sidebar-accent)]'
                  : 'border-transparent hover:border-[var(--sidebar-border)] hover:text-[oklch(0.78_0.008_65)]'
              )}
              style={{
                color: isActive ? 'var(--sidebar-accent)' : 'var(--sidebar-foreground)',
              }}
            >
              <Icon
                className="shrink-0 transition-colors"
                style={{ width: 13, height: 13 }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--sidebar-border)' }} className="mx-4" />

      {/* User / logout */}
      <div className="px-5 py-4 space-y-2">
        <p
          className="text-[10px] tracking-wide truncate"
          style={{ color: 'oklch(0.45 0.006 65)' }}
        >
          {profile?.nombre ?? user?.email}
        </p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-[10px] tracking-widest uppercase transition-colors"
          style={{ color: 'oklch(0.42 0.006 65)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--sidebar-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.42 0.006 65)')}
        >
          <LogOut style={{ width: 11, height: 11 }} />
          Salir
        </button>
      </div>
    </aside>
  )
}
