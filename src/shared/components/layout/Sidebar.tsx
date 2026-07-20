'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import {
  LayoutGrid,
  Users,
  TrendingUp,
  Receipt,
  Briefcase,
  CalendarClock,
  UserCog,
  Wallet,
  Package,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  labelEmpleada?: string
  icon: React.ElementType
  adminOnly?: boolean
  empleadaVisible?: boolean
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid, adminOnly: false, empleadaVisible: true },
  { href: '/clientes', label: 'Clientes', icon: Users, adminOnly: false, empleadaVisible: false },
  {
    href: '/honorarios',
    label: 'Honorarios',
    icon: TrendingUp,
    adminOnly: false,
    empleadaVisible: false,
  },
  {
    href: '/cobranzas',
    label: 'Cobranzas',
    icon: Receipt,
    adminOnly: false,
    empleadaVisible: false,
  },
  {
    href: '/trabajos',
    label: 'Trabajos',
    icon: Briefcase,
    adminOnly: false,
    empleadaVisible: true,
    labelEmpleada: 'Mis Trabajos',
  },
  {
    href: '/empleadas',
    label: 'Empleadas',
    icon: UserCog,
    adminOnly: true,
    empleadaVisible: false,
  },
  { href: '/fondos', label: 'Fondos', icon: Wallet, adminOnly: true, empleadaVisible: false },
  {
    href: '/proveedores',
    label: 'Proveedores',
    icon: Package,
    adminOnly: true,
    empleadaVisible: false,
  },
  {
    href: '/vencimientos',
    label: 'Vencimientos',
    icon: CalendarClock,
    adminOnly: true,
    empleadaVisible: false,
  },
  {
    href: '/reportes',
    label: 'Reportes',
    icon: BarChart3,
    adminOnly: true,
    empleadaVisible: false,
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    icon: Settings,
    adminOnly: false,
    empleadaVisible: false,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, profile, isAdmin } = useAuth()

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (!isAdmin) return item.empleadaVisible === true
    return true
  })

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['trabajos_pendientes_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('trabajos_realizados')
        .select('*', { count: 'exact', head: true })
        .is('aprobado_at', null)
      if (error) return 0
      return count ?? 0
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  return (
    <aside
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
      className="flex h-full w-52 shrink-0 flex-col"
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0" style={{ background: 'var(--sidebar-accent)' }} />
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
      <nav className="flex-1 space-y-0.5 px-0 py-4">
        {visibleNavItems.map((item) => {
          const { href, icon: Icon } = item
          const label = !isAdmin && item.labelEmpleada ? item.labelEmpleada : item.label
          const isActive = href === '/' ? pathname === href : pathname.startsWith(href)
          const showBadge = isAdmin && href === '/trabajos' && pendingCount > 0

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center justify-between gap-3 px-5 py-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors',
                'border-l-2',
                isActive
                  ? 'border-[var(--sidebar-accent)] text-[var(--sidebar-accent)]'
                  : 'border-transparent hover:border-[var(--sidebar-border)] hover:text-[oklch(0.78_0.008_65)]'
              )}
              style={{
                color: isActive ? 'var(--sidebar-accent)' : 'var(--sidebar-foreground)',
              }}
            >
              <span className="flex items-center gap-3">
                <Icon className="shrink-0 transition-colors" style={{ width: 13, height: 13 }} />
                {label}
              </span>
              {showBadge && (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums"
                  style={{ background: 'var(--sidebar-accent)', color: 'var(--sidebar)' }}
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--sidebar-border)' }} className="mx-4" />

      {/* User / logout */}
      <div className="space-y-2 px-5 py-4">
        <p className="truncate text-[10px] tracking-wide" style={{ color: 'oklch(0.45 0.006 65)' }}>
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
