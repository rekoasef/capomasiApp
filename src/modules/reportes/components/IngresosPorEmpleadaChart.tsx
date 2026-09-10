'use client'

import { useMemo } from 'react'
import { useIngresosPorEmpleada } from '../hooks/useReportes'
import { construirRanking } from '../services/resumenReportes'
import { RankingBarras } from './RankingBarras'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
  mes?: number
}

export function IngresosPorEmpleadaChart({ anio, mes }: Props) {
  const { data, isLoading, isFetching } = useIngresosPorEmpleada(anio, mes)

  const items = useMemo(
    () =>
      construirRanking(
        (data ?? []).map((r) => ({
          clave: r.empleada,
          etiqueta: r.empleada,
          total: r.total_liquidado,
          cantidad: r.cantidad,
        }))
      ),
    [data]
  )

  if (isLoading) return <Skeleton className="h-[220px] w-full" />

  if (!items.length) {
    return (
      <div className="border-border bg-surface border">
        <p className="text-muted-foreground py-12 text-center text-xs tracking-widest uppercase">
          Sin ingresos registrados en {anio}
        </p>
      </div>
    )
  }

  return (
    <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
      <RankingBarras items={items} unidad={{ singular: 'trabajo', plural: 'trabajos' }} />
    </div>
  )
}
