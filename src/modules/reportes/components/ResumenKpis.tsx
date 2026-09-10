'use client'

import { useMemo } from 'react'
import { useIngresosMensuales } from '../hooks/useReportes'
import { calcularResumen } from '../services/resumenReportes'
import { formatMoney } from '@/shared/utils/formatters'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
  mes?: number
}

const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function nombreMes(iso: string): string {
  const [anio, mes] = iso.split('-')
  return `${MESES_LARGOS[Number(mes) - 1] ?? mes} ${anio}`
}

/**
 * Una cifra por tarjeta. El valor va en figuras proporcionales (no tabular): a
 * tamaño grande el tabular deja los números flojos, y acá no hay ninguna columna
 * con la que alinear.
 */
function Tarjeta({
  rotulo,
  valor,
  detalle,
  destacada = false,
}: {
  rotulo: string
  valor: string
  detalle?: string
  destacada?: boolean
}) {
  return (
    <div
      className={`bg-surface border p-4 transition-colors duration-200 ${
        destacada ? 'border-primary/50' : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
        {rotulo}
      </p>
      <p className="mt-2 text-2xl leading-none font-bold">{valor}</p>
      {detalle ? <p className="text-muted-foreground mt-1.5 text-[11px]">{detalle}</p> : null}
    </div>
  )
}

export function ResumenKpis({ anio, mes }: Props) {
  const { data, isLoading } = useIngresosMensuales(anio, mes)

  const resumen = useMemo(() => calcularResumen(data ?? []), [data])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full" />
        ))}
      </div>
    )
  }

  if (!data?.length) return null

  const ivaTotal = resumen.totalFacturado - resumen.totalLiquidado

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tarjeta
        rotulo="Ingresos (base)"
        valor={formatMoney(resumen.totalLiquidado)}
        detalle={`${resumen.cantidad} comprobantes`}
        destacada
      />
      <Tarjeta
        rotulo="Facturado c/IVA"
        valor={formatMoney(resumen.totalFacturado)}
        detalle={ivaTotal > 0 ? `${formatMoney(ivaTotal)} de IVA` : 'Sin IVA discriminado'}
      />
      <Tarjeta
        rotulo="Promedio mensual"
        valor={formatMoney(resumen.promedioMensual)}
        detalle={`Sobre ${data.length} ${data.length === 1 ? 'mes' : 'meses'} con movimiento`}
      />
      <Tarjeta
        rotulo="Mejor mes"
        valor={resumen.mesPico ? formatMoney(resumen.mesPico.total) : '—'}
        detalle={resumen.mesPico ? nombreMes(resumen.mesPico.mes) : undefined}
      />
    </div>
  )
}
