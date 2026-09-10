'use client'

import { formatMoney } from '@/shared/utils/formatters'
import { SERIE_BASE } from './chartTheme'
import type { TItemRanking } from '../services/resumenReportes'

type Props = {
  items: TItemRanking[]
  /** Cuántos ítems se muestran antes de plegar la cola en "Otros". */
  maxItems?: number
  /** Sustantivo para el conteo, en singular y plural. */
  unidad?: { singular: string; plural: string }
}

/**
 * Ranking en barras horizontales. Se dibuja con divs y no con Recharts a
 * propósito: son categorías con nombres largos, y en HTML la etiqueta puede
 * fluir y truncarse sola sin pelear con el layout de un SVG.
 *
 * Un solo color para todas las barras. Oscurecer la barra según su tamaño sería
 * pintar dos veces la misma información (el largo ya la dice) y quemaría el
 * único canal libre que queda.
 */
export function RankingBarras({
  items,
  maxItems = 8,
  unidad = { singular: 'liquidación', plural: 'liquidaciones' },
}: Props) {
  if (!items.length) return null

  const visibles = items.slice(0, maxItems)
  const cola = items.slice(maxItems)
  const totalCola = cola.reduce((s, i) => s + i.total, 0)
  const cantidadCola = cola.reduce((s, i) => s + i.cantidad, 0)
  const participacionCola = cola.reduce((s, i) => s + i.participacion, 0)

  const filas = [
    ...visibles,
    ...(cola.length
      ? [
          {
            clave: '__otros__',
            etiqueta: `Otros (${cola.length})`,
            total: totalCola,
            cantidad: cantidadCola,
            participacion: participacionCola,
          },
        ]
      : []),
  ]

  // La escala se toma del ítem más grande, no del total: así la barra más larga
  // llena el ancho y las diferencias entre las de abajo se leen.
  const maximo = Math.max(...filas.map((f) => f.total), 1)

  return (
    <div className="border-border bg-surface border">
      <ul className="divide-border divide-y">
        {filas.map((item) => {
          const esOtros = item.clave === '__otros__'
          return (
            <li
              key={item.clave}
              className="hover:bg-muted/30 group px-4 py-3 transition-colors duration-150"
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={item.etiqueta}>
                  {item.etiqueta}
                </span>
                {/* Etiqueta directa: el valor siempre está visible, el hover no
                    es la única forma de leerlo. */}
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(item.total)}
                </span>
                <span className="text-muted-foreground w-12 shrink-0 text-right text-xs tabular-nums">
                  {item.participacion.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-muted h-1.5 min-w-0 flex-1">
                  <div
                    className="h-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.max((item.total / maximo) * 100, 1)}%`,
                      backgroundColor: esOtros ? 'var(--muted-foreground)' : SERIE_BASE,
                      opacity: esOtros ? 0.45 : 1,
                    }}
                  />
                </div>
                <span className="text-muted-foreground w-28 shrink-0 text-right text-[11px] tabular-nums">
                  {item.cantidad} {item.cantidad === 1 ? unidad.singular : unidad.plural}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
