'use client'

import { useMemo, useState } from 'react'
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

const MESES = [
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

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function MesRow({ mes }: { mes: TIngresoMensual }) {
  const fecha = new Date(mes.mes + 'T12:00:00')
  const label = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <tr className="border-border border-b last:border-0">
      <td className="py-2 pr-4 pl-4 text-sm capitalize">{label}</td>
      <td className="py-2 pr-4 text-right text-sm font-medium tabular-nums">
        {formatMoney(mes.ingreso_base_negro)}
      </td>
      <td className="text-muted-foreground py-2 pr-4 text-right text-sm tabular-nums">
        {formatMoney(mes.facturado_cliente_neto)}
      </td>
      <td className="text-muted-foreground py-2 pr-4 text-right text-sm tabular-nums">
        {formatMoney(mes.iva_facturado)}
      </td>
      <td className="text-muted-foreground py-2 text-right text-xs tabular-nums">
        {mes.cantidad_liquidaciones}
      </td>
    </tr>
  )
}

function AdminDashboard() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1

  const { data, isLoading } = useDashboardResumen({ anio, mes })
  const anios = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i)

  const statsMes = [
    {
      label: 'Ingreso base',
      value: formatMoney(data?.ingreso_base_negro_mes_actual ?? 0),
      sub: 'Factura C + Presupuestos',
      accent: true,
    },
    {
      label: 'Facturado cliente',
      value: formatMoney(data?.facturado_cliente_neto_mes_actual ?? 0),
      sub: 'Neto — Factura A + B',
    },
    {
      label: 'IVA facturado',
      value: formatMoney(data?.iva_facturado_mes_actual ?? 0),
    },
  ]

  const statsOperativo = [
    {
      label: 'Deuda total clientes',
      value: formatMoney(data?.deuda_total_clientes ?? 0),
      sub: `${data?.clientes_deudores ?? 0} clientes`,
      href: '/cobranzas',
    },
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

      {/* Selector de mes */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {anios.map((a) => (
            <button
              key={a}
              onClick={() => setAnio(a)}
              className={`border px-2.5 py-1 text-xs font-semibold transition-colors ${
                a === anio
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="border-border bg-surface text-foreground focus:ring-primary border px-2.5 py-1 text-xs font-medium focus:ring-1 focus:outline-none"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        {!esMesActual && (
          <button
            onClick={() => {
              setAnio(hoy.getFullYear())
              setMes(hoy.getMonth() + 1)
            }}
            className="text-primary text-xs font-medium hover:underline"
          >
            Volver al mes actual
          </button>
        )}
      </div>

      <section>
        <SectionTitle>
          {MESES[mes - 1]} {anio}
        </SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {statsMes.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Operativo (hoy)</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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

        {/* Alert impuestos personales sin pagar */}
        {!isLoading && (data?.impuestos_personales_vencidos ?? 0) > 0 && (
          <Link
            href="/vencimientos"
            className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 mt-3 flex items-center gap-2 border px-4 py-2.5 text-xs font-medium transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {data!.impuestos_personales_vencidos} impuesto
            {data!.impuestos_personales_vencidos !== 1 ? 's' : ''} personal
            {data!.impuestos_personales_vencidos !== 1 ? 'es' : ''} sin marcar como pagado
          </Link>
        )}
      </section>

      <section>
        <SectionTitle>
          Resultado del estudio — {MESES[mes - 1]} {anio}
        </SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Ingresos del mes"
              value={formatMoney(data?.resultado_mes_actual.total_ingresos ?? 0)}
            />
            <StatCard
              label="Sueldos"
              value={formatMoney(data?.resultado_mes_actual.gasto_sueldos ?? 0)}
            />
            <StatCard
              label="Proveedores + gastos"
              value={formatMoney(
                (data?.resultado_mes_actual.gasto_proveedores ?? 0) +
                  (data?.resultado_mes_actual.gasto_manual_estudio ?? 0)
              )}
              sub="Compras a proveedores + gastos del estudio"
            />
            <StatCard
              label="Resultado"
              value={formatMoney(data?.resultado_mes_actual.resultado ?? 0)}
              accent={(data?.resultado_mes_actual.resultado ?? 0) >= 0}
              warning={(data?.resultado_mes_actual.resultado ?? 0) < 0}
            />
          </div>
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
                    Ingreso base
                  </th>
                  <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                    Facturado cliente
                  </th>
                  <th className="text-muted-foreground py-2 pr-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                    IVA
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
