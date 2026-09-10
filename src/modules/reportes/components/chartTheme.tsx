'use client'

import { formatMoney } from '@/shared/utils/formatters'

/**
 * Tokens de gráfico para Reportes.
 *
 * Los colores de las marcas salen de la paleta categórica validada del skill de
 * dataviz — los mismos slots que ya usa `GastosPieChart`. Se validaron contra la
 * superficie real de la app (`#ffffff`): los dos slots pasan las seis pruebas,
 * incluida la separación para daltonismo y el contraste ≥ 3:1.
 *
 * El ámbar de marca NO se usa para marcas de datos: sobre blanco da 2,68:1 y
 * quedaría por debajo del piso. Se reserva para el chrome de la UI (acentos,
 * bordes de sección), que es donde ya vive en el resto del sistema.
 */
export const SERIE_BASE = '#2a78d6' // slot 1 — importe base (sin IVA)
export const SERIE_IVA = '#eb6834' // slot 2 — el IVA/recargo apilado encima

export const EJE = 'var(--muted-foreground)'
export const GRILLA = 'var(--color-border)'
export const SUPERFICIE = 'var(--color-surface)'

/** Cortito para los ejes: $1,2 M / $840 k. Los importes exactos van al tooltip. */
export function formatMoneyCorto(valor: number): string {
  const abs = Math.abs(valor)
  if (abs >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000) return `$${Math.round(valor / 1_000)} k`
  return `$${Math.round(valor)}`
}

export type FilaTooltip = {
  etiqueta: string
  valor: string
  color?: string
  fuerte?: boolean
}

/**
 * Tooltip común a todos los gráficos del módulo.
 *
 * El valor va primero y en alto contraste, y el nombre de la serie va secundario:
 * quien tiene el puntero sobre una barra ya sabe qué serie es y lo que quiere es
 * el número. La serie se marca con un trazo, no con un cuadrado relleno.
 */
export function TooltipGrafico({ titulo, filas }: { titulo: string; filas: FilaTooltip[] }) {
  return (
    <div className="border-border bg-surface min-w-[190px] border p-3 shadow-sm">
      <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-widest uppercase">
        {titulo}
      </p>
      <ul className="space-y-1.5">
        {filas.map((fila) => (
          <li key={fila.etiqueta} className="flex items-baseline gap-2">
            {fila.color ? (
              <span
                aria-hidden
                className="mt-1.5 h-0.5 w-3 shrink-0"
                style={{ backgroundColor: fila.color }}
              />
            ) : (
              <span aria-hidden className="w-3 shrink-0" />
            )}
            <span
              className={
                fila.fuerte
                  ? 'text-foreground flex-1 text-sm font-bold tabular-nums'
                  : 'text-foreground flex-1 text-sm font-semibold tabular-nums'
              }
            >
              {fila.valor}
            </span>
            <span className="text-muted-foreground text-[11px]">{fila.etiqueta}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Leyenda con la misma marca que el gráfico (rectángulo para barras y áreas). */
export function LeyendaSeries({ series }: { series: { nombre: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s) => (
        <li key={s.nombre} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <span aria-hidden className="h-2 w-2.5 shrink-0" style={{ backgroundColor: s.color }} />
          {s.nombre}
        </li>
      ))}
    </ul>
  )
}

export { formatMoney }
