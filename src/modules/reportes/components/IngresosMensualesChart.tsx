'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useIngresosMensuales } from '../hooks/useReportes'
import { construirBarrasMensuales, type TBarraMensual } from '../services/resumenReportes'
import {
  EJE,
  GRILLA,
  LeyendaSeries,
  SERIE_BASE,
  SERIE_IVA,
  SUPERFICIE,
  TooltipGrafico,
  formatMoneyCorto,
} from './chartTheme'
import { formatMoney } from '@/shared/utils/formatters'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
  mes?: number
}

function ContenidoTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: TBarraMensual }[]
}) {
  if (!active || !payload?.length) return null
  const b = payload[0].payload

  return (
    <TooltipGrafico
      titulo={b.etiqueta}
      filas={[
        { etiqueta: 'base', valor: formatMoney(b.base), color: SERIE_BASE, fuerte: true },
        ...(b.iva > 0 ? [{ etiqueta: 'IVA', valor: formatMoney(b.iva), color: SERIE_IVA }] : []),
        { etiqueta: 'facturado', valor: formatMoney(b.facturado) },
        { etiqueta: b.cantidad === 1 ? 'comprobante' : 'comprobantes', valor: String(b.cantidad) },
      ]}
    />
  )
}

export function IngresosMensualesChart({ anio, mes }: Props) {
  const { data, isLoading, isFetching } = useIngresosMensuales(anio, mes)

  const barras = useMemo(() => construirBarrasMensuales(data ?? []), [data])
  const picoMes = useMemo(() => {
    if (!barras.length) return null
    return barras.reduce((max, b) => (b.base > max.base ? b : max)).mes
  }, [barras])

  if (isLoading) return <Skeleton className="h-[320px] w-full" />

  if (!barras.length) {
    return (
      <div className="border-border bg-surface border">
        <p className="text-muted-foreground py-16 text-center text-xs tracking-widest uppercase">
          Sin ingresos registrados en {anio}
        </p>
      </div>
    )
  }

  const hayIva = barras.some((b) => b.iva > 0)

  return (
    // Mientras refetchea se mantiene el render anterior atenuado: sin skeleton,
    // sin salto de layout.
    <div
      className={`border-border bg-surface border p-4 transition-opacity duration-200 ${
        isFetching ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-[11px]">
          El mes más alto queda resaltado. Pasá el mouse por una barra para ver el detalle.
        </p>
        {hayIva ? (
          <LeyendaSeries
            series={[
              { nombre: 'Base', color: SERIE_BASE },
              { nombre: 'IVA', color: SERIE_IVA },
            ]}
          />
        ) : null}
      </div>

      {/* Alto fijo que ya incluye la banda del eje X, para que no aparezca un
          scroll vertical dentro de la tarjeta. */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barras}
            margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
            barCategoryGap="28%"
          >
            <CartesianGrid stroke={GRILLA} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={{ stroke: GRILLA }}
              tick={{ fill: EJE, fontSize: 11 }}
              dy={4}
            />
            <YAxis
              tickFormatter={formatMoneyCorto}
              tickLine={false}
              axisLine={false}
              tick={{ fill: EJE, fontSize: 11 }}
              width={76}
            />
            <Tooltip
              content={<ContenidoTooltip />}
              cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.5 }}
            />
            <Bar dataKey="base" stackId="importe" fill={SERIE_BASE} maxBarSize={54}>
              {barras.map((b) => (
                // El mes pico va pleno y el resto apenas atenuado: la forma
                // "énfasis", que deja ver de un vistazo cuál fue el mejor mes
                // sin agregar un color nuevo.
                <Cell key={b.mes} fillOpacity={picoMes === b.mes ? 1 : 0.78} />
              ))}
            </Bar>
            {hayIva ? (
              <Bar
                dataKey="iva"
                stackId="importe"
                fill={SERIE_IVA}
                maxBarSize={54}
                // 2px de superficie entre los dos tramos apilados, en vez de un
                // borde alrededor de las marcas.
                stroke={SUPERFICIE}
                strokeWidth={2}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
