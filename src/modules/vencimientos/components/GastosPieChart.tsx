'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '@/shared/utils/formatters'
import type { TResumenCategoria } from '../types'

// Paleta categórica validada (dataviz skill) — se usa solo cuando una
// categoría no tiene color propio asignado en Configuración. El slot se
// elige por hash del id, no por posición, para que el color de una
// categoría no cambie cuando un filtro reordena el ranking.
const FALLBACK_PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
const OTROS_COLOR = 'var(--muted-foreground)'
const MAX_SLICES = 5

function colorParaCategoria(id: string, color: string | null): string {
  if (color) return color
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}

interface Slice {
  id: string
  nombre: string
  total: number
  color: string
}

function buildSlices(items: TResumenCategoria[]): Slice[] {
  const ordenado = [...items].sort((a, b) => b.total - a.total)
  const principales = ordenado.slice(0, MAX_SLICES)
  const resto = ordenado.slice(MAX_SLICES)

  const slices: Slice[] = principales.map((item) => ({
    id: item.categoria_id,
    nombre: item.categoria_nombre,
    total: item.total,
    color: colorParaCategoria(item.categoria_id, item.categoria_color),
  }))

  const totalResto = resto.reduce((sum, item) => sum + item.total, 0)
  if (totalResto > 0) {
    slices.push({ id: 'otros', nombre: 'Otros', total: totalResto, color: OTROS_COLOR })
  }

  return slices
}

const RADIAN = Math.PI / 180

function renderSliceLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  payload?: Slice & { pct: number }
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, payload } = props
  if (!payload || payload.pct < 8) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-white text-[11px] font-bold"
    >
      {`${payload.pct.toFixed(0)}%`}
    </text>
  )
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: Slice & { pct: number } }[]
}) {
  if (!active || !payload?.length) return null
  const slice = payload[0].payload
  return (
    <div className="border-border bg-surface border px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold">{slice.nombre}</p>
      <p className="text-muted-foreground tabular-nums">
        {formatMoney(slice.total)} · {slice.pct.toFixed(0)}%
      </p>
    </div>
  )
}

interface GastosPieChartProps {
  items: TResumenCategoria[]
}

export function GastosPieChart({ items }: GastosPieChartProps) {
  const { slices, total } = useMemo(() => {
    const built = buildSlices(items)
    const totalSum = built.reduce((sum, s) => sum + s.total, 0)
    return {
      slices: built.map((s) => ({ ...s, pct: totalSum > 0 ? (s.total / totalSum) * 100 : 0 })),
      total: totalSum,
    }
  }, [items])

  if (!slices.length) {
    return (
      <div className="border-border bg-surface border p-6">
        <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
          Sin datos para graficar
        </p>
      </div>
    )
  }

  return (
    <div className="border-border bg-surface border p-4">
      <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="total"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="var(--color-surface)"
                strokeWidth={2}
                isAnimationActive={false}
                label={renderSliceLabel}
                labelLine={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.id} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
              Total
            </p>
            <p className="text-sm font-bold tabular-nums">{formatMoney(total)}</p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="min-w-0 flex-1 truncate font-medium">{slice.nombre}</span>
              <span className="text-muted-foreground tabular-nums">{slice.pct.toFixed(0)}%</span>
              <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                {formatMoney(slice.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
