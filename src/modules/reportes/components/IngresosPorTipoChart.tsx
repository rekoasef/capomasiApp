'use client'

import { useMemo } from 'react'
import { useIngresosPorTipo } from '../hooks/useReportes'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_SERVICIO } from '@/shared/lib/parametros'
import { construirRanking, humanizarCodigo } from '../services/resumenReportes'
import { RankingBarras } from './RankingBarras'
import { Skeleton } from '@/shared/components/ui/skeleton'

type Props = {
  anio: number
  mes?: number
}

export function IngresosPorTipoChart({ anio, mes }: Props) {
  const { data, isLoading, isFetching } = useIngresosPorTipo(anio, mes)
  const { data: tipos = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })

  const items = useMemo(
    () =>
      construirRanking(
        (data ?? []).map((r) => ({
          clave: r.tipo_servicio,
          etiqueta:
            tipos.find((t) => t.value === r.tipo_servicio)?.label ??
            humanizarCodigo(r.tipo_servicio),
          total: r.total_liquidado,
          cantidad: r.cantidad,
        }))
      ),
    [data, tipos]
  )

  if (isLoading) return <Skeleton className="h-[280px] w-full" />

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
      <RankingBarras items={items} unidad={{ singular: 'liquidación', plural: 'liquidaciones' }} />
    </div>
  )
}
