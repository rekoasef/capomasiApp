'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/useAuth'
import { useDashboardResumen, useDashboardEmpleada } from '@/modules/dashboard/hooks/useDashboard'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { AlertTriangle } from 'lucide-react'
import type { TIngresoMensual } from '@/modules/dashboard/types'

// ── Shared components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  warning,
  href,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  warning?: boolean
  href?: string
}) {
  const content = (
    <div
      className={`bg-surface border p-5 transition-colors ${
        warning ? 'border-warning/40 bg-warning/5' : 'border-border'
      } ${href ? 'hover:border-primary cursor-pointer' : ''}`}
    >
      <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-widest uppercase">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tabular-nums ${accent ? 'text-primary' : warning ? 'text-warning' : 'text-foreground'}`}
      >
        {value}
      </p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-primary mb-1 h-0.5 w-6" />
      <h2 className="text-muted-foreground mb-4 text-xs font-bold tracking-widest uppercase">
        {children}
      </h2>
    </div>
  )
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function MesRow({ mes }: { mes: TIngresoMensual }) {
  const fecha = new Date(mes.mes + 'T12:00:00')
  const label = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const tieneIva = mes.total_facturado !== mes.total_liquidado

  return (
    <tr className="border-border border-b last:border-0">
      <td className="py-2 pr-4 pl-4 text-sm capitalize">{label}</td>
      <td className="py-2 pr-4 text-right text-sm font-medium tabular-nums">
        {formatMoney(mes.total_liquidado)}
      </td>
      <td className="text-muted-foreground py-2 pr-4 text-right text-sm tabular-nums">
        {tieneIva ? (
          formatMoney(mes.total_facturado)
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="text-muted-foreground py-2 text-right text-xs tabular-nums">
        {mes.cantidad_liquidaciones}
      </td>
    </tr>
  )
}

function AdminDashboard() {
  const { data, isLoading } = useDashboardResumen()

  const statsMes = [
    {
      label: 'Ingresos (base)',
      value: formatMoney(data?.ingresos_mes_actual ?? 0),
      sub: 'Sin IVA',
      accent: true,
    },
    {
      label: 'Facturado a clientes',
      value: formatMoney(data?.facturado_mes_actual ?? 0),
      sub: 'Con IVA si corresponde',
    },
    {
      label: 'Deuda total clientes',
      value: formatMoney(data?.deuda_total_clientes ?? 0),
      sub: `${data?.clientes_deudores ?? 0} clientes`,
      href: '/cobranzas',
    },
    {
      label: 'IVA facturado',
      value: formatMoney((data?.facturado_mes_actual ?? 0) - (data?.ingresos_mes_actual ?? 0)),
    },
  ]

  const statsOperativo = [
    {
      label: 'Trabajos pendientes',
      value: String(data?.trabajos_pendientes ?? 0),
      href: '/trabajos',
      sub: 'Honorarios anuales',
    },
    { label: 'En proceso', value: String(data?.trabajos_en_proceso ?? 0), href: '/trabajos' },
    {
      label: 'Cola de facturación',
      value: String(data?.cola_facturacion ?? 0),
      href: '/trabajos',
      accent: (data?.cola_facturacion ?? 0) > 0,
    },
    {
      label: 'Vencimientos próx. 7d',
      value: String(data?.vencimientos_proximos_7_dias ?? 0),
      href: '/vencimientos',
      sub: data?.vencimientos_vencidos ? `+ ${data.vencimientos_vencidos} vencidos` : undefined,
      warning: (data?.vencimientos_vencidos ?? 0) > 0,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Resumen general del estudio" />

      <section>
        <SectionTitle>Mes en curso</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statsMes.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Operativo</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statsOperativo.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )}

        {/* Alert vencimientos vencidos */}
        {!isLoading && (data?.vencimientos_vencidos ?? 0) > 0 && (
          <Link
            href="/vencimientos"
            className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 mt-3 flex items-center gap-2 border px-4 py-2.5 text-xs font-medium transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {data!.vencimientos_vencidos} vencimiento{data!.vencimientos_vencidos !== 1 ? 's' : ''}{' '}
            pasado{data!.vencimientos_vencidos !== 1 ? 's' : ''} sin completar — revisá el
            calendario fiscal
          </Link>
        )}
      </section>

      <section>
        <SectionTitle>Últimos 6 meses</SectionTitle>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : !data?.ultimos_6_meses.length ? (
          <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
            Sin datos
          </p>
        ) : (
          <div className="border-border bg-surface border">
            <table className="w-full text-sm">
              <thead className="border-border bg-muted/30 border-b">
                <tr>
                  <th className="text-muted-foreground py-2 pr-4 pl-4 text-left text-[11px] font-semibold tracking-wide uppercase">
                    Mes
                  </th>
                  <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                    Ingresos (base)
                  </th>
                  <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                    Facturado c/IVA
                  </th>
                  <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                    Liquidaciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {data.ultimos_6_meses.map((mes) => (
                  <MesRow key={mes.mes} mes={mes} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Empleada Dashboard ────────────────────────────────────────────────────────

function EmpleadaDashboard({ empleadaId }: { empleadaId: string }) {
  const { data, isLoading } = useDashboardEmpleada(empleadaId)

  const MESES_NOMBRE = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  const mesActual = MESES_NOMBRE[new Date().getMonth()]

  return (
    <div className="space-y-8">
      <PageHeader title="Mi Panel" description={`Resumen de ${mesActual}`} />

      <section>
        <SectionTitle>Este mes</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Pendientes"
              value={String(data?.mis_pendientes ?? 0)}
              sub="Por hacer"
              href="/trabajos"
            />
            <StatCard
              label="En proceso"
              value={String(data?.mis_en_proceso ?? 0)}
              sub="Iniciados o avanzando"
              href="/trabajos"
              accent
            />
            <StatCard
              label="Terminados"
              value={String(data?.mis_terminados_mes ?? 0)}
              sub="Aprobados este mes"
              href="/trabajos"
            />
            <StatCard
              label="Puntos del mes"
              value={String(data?.mis_puntos_mes ?? 0)}
              sub="Acumulados"
              accent={!!(data?.mis_puntos_mes && data.mis_puntos_mes > 0)}
            />
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Vencimientos próximos (7 días)</SectionTitle>
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-none" />
            ))}
          </div>
        ) : !data?.vencimientos_proximos.length ? (
          <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
            Sin vencimientos en los próximos 7 días
          </p>
        ) : (
          <div className="border-border divide-border divide-y border">
            {data.vencimientos_proximos.map((v) => (
              <div key={v.id} className="bg-surface flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{v.cliente_nombre}</p>
                  <p className="text-muted-foreground text-xs">{v.descripcion}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-xs font-semibold ${v.dias_restantes <= 2 ? 'text-danger' : v.dias_restantes <= 4 ? 'text-warning' : 'text-foreground'}`}
                  >
                    {v.dias_restantes === 0
                      ? 'Hoy'
                      : v.dias_restantes === 1
                        ? 'Mañana'
                        : `${v.dias_restantes}d`}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {formatDate(v.fecha_vencimiento)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/trabajos"
          className="text-primary mt-2 block text-center text-xs font-medium hover:underline"
        >
          Ver todos mis trabajos →
        </Link>
      </section>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const { data: empleadas = [] } = useEmpleadas()

  const empleadaPropia = useMemo(
    () => empleadas.find((e) => e.usuario_id === user?.id),
    [empleadas, user?.id]
  )

  if (authLoading) return null
  if (isAdmin) return <AdminDashboard />
  if (empleadaPropia) return <EmpleadaDashboard empleadaId={empleadaPropia.id} />

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Panel de inicio" />
      <p className="text-muted-foreground text-sm">Sin datos disponibles para tu usuario.</p>
    </div>
  )
}
