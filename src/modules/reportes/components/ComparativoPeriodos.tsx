'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useComparativoPeriodos } from '../hooks/useReportes'
import { calcularVariacionPct } from '../services/sumarIngresos'
import {
  construirPresetsComparativo,
  rangoSinDatosPosibles,
  type TRangoFechas,
} from '../services/resumenReportes'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { SERIE_BASE } from './chartTheme'

// Dos tonos de un mismo azul (pasos 450 y 250 de la rampa secuencial): es un
// "antes y después" del mismo indicador, no dos categorías distintas, así que
// no corresponde gastar dos colores del set categórico.
const COLOR_A = SERIE_BASE
const COLOR_B = '#86b6ef'

const BUENO = '#0ca30c'
const MALO = '#d03b3b'

// Bandera "ya estamos en el navegador" sin efectos: useSyncExternalStore
// devuelve el snapshot del server en el HTML y el del cliente al hidratar.
// Constantes de módulo para que las referencias sean estables entre renders.
const sinSuscripcion = () => () => {}
const siempreCliente = () => true
const siempreServidor = () => false

type FormRangos = { aDesde: string; aHasta: string; bDesde: string; bHasta: string }

function comoForm(a: TRangoFechas, b: TRangoFechas): FormRangos {
  return { aDesde: a.desde, aHasta: a.hasta, bDesde: b.desde, bHasta: b.hasta }
}

/**
 * Una métrica comparada: dos barras a la misma escala local más la diferencia.
 *
 * Cada métrica se escala contra su propio máximo. No comparten eje a propósito:
 * los importes y la cantidad de comprobantes son magnitudes distintas y meterlas
 * en una sola escala inventaría una relación entre ellas.
 */
function FilaMetrica({
  rotulo,
  valorA,
  valorB,
  formato,
}: {
  rotulo: string
  valorA: number
  valorB: number
  formato: (n: number) => string
}) {
  const maximo = Math.max(valorA, valorB, 1)
  const variacion = calcularVariacionPct(valorB, valorA)
  const subio = variacion !== null && variacion >= 0

  return (
    <div className="border-border border-b px-4 py-3 last:border-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
          {rotulo}
        </span>
        {variacion === null ? (
          <span className="text-muted-foreground text-[11px]">sin base para comparar</span>
        ) : (
          <span className="text-xs font-bold tabular-nums" style={{ color: subio ? BUENO : MALO }}>
            {/* El signo y la palabra van siempre: el color no es lo único que
                dice si subió o bajó. */}
            {subio ? '▲' : '▼'} {subio ? '+' : ''}
            {variacion.toFixed(1)}% {subio ? 'más' : 'menos'}
          </span>
        )}
      </div>

      {[
        { etiqueta: 'A', valor: valorA, color: COLOR_A },
        { etiqueta: 'B', valor: valorB, color: COLOR_B },
      ].map((barra) => (
        <div key={barra.etiqueta} className="mb-1 flex items-center gap-2 last:mb-0">
          <span className="text-muted-foreground w-3 shrink-0 text-[10px] font-bold">
            {barra.etiqueta}
          </span>
          <div className="bg-muted h-4 min-w-0 flex-1">
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.max((barra.valor / maximo) * 100, 0.5)}%`,
                backgroundColor: barra.color,
              }}
            />
          </div>
          <span className="w-36 shrink-0 text-right text-sm font-semibold tabular-nums">
            {formato(barra.valor)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ComparativoPeriodos() {
  // "Hoy" se resuelve recién en el navegador. Calcularlo durante el render lo
  // haría correr también en el server, que en Vercel va en UTC: entre las 21 y
  // la medianoche de Argentina el server ya está en el día siguiente y los
  // rangos por defecto salían con un día de más.
  const enElNavegador = useSyncExternalStore(sinSuscripcion, siempreCliente, siempreServidor)

  const presets = useMemo(
    () => (enElNavegador ? construirPresetsComparativo() : []),
    [enElNavegador]
  )
  const [presetActivo, setPresetActivo] = useState<string>('mes-vs-anterior')
  const [form, setForm] = useState<FormRangos | null>(null)
  const [aplicado, setAplicado] = useState<FormRangos | null>(null)

  // Ajuste de estado durante el render, el mismo patrón que usa la página para
  // el año por defecto: no es un efecto, así que no encadena renders.
  if (presets.length && form === null) {
    const inicial = comoForm(presets[0].a, presets[0].b)
    setForm(inicial)
    setAplicado(inicial)
  }

  const { data, isLoading, isFetching } = useComparativoPeriodos(
    aplicado ? { desde: aplicado.aDesde, hasta: aplicado.aHasta } : null,
    aplicado ? { desde: aplicado.bDesde, hasta: aplicado.bHasta } : null
  )

  const aplicarPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id)
    if (!preset) return
    const nuevo = comoForm(preset.a, preset.b)
    setPresetActivo(id)
    setForm(nuevo)
    setAplicado(nuevo)
  }

  const editar = (campo: keyof FormRangos, valor: string) => {
    setPresetActivo('personalizado')
    setForm((f) => (f ? { ...f, [campo]: valor } : f))
  }

  // Hasta que el navegador resuelve "hoy" no hay rangos que mostrar.
  if (!form || !aplicado) return <Skeleton className="h-[420px] w-full" />

  const hayCambiosSinAplicar = JSON.stringify(form) !== JSON.stringify(aplicado)

  // Los datos arrancan en nov-2025. Un período B anterior a eso da $0,00 y no es
  // un error del sistema: se avisa en vez de dejar que parezca un bug.
  const periodoBVacio = rangoSinDatosPosibles({ desde: aplicado.bDesde, hasta: aplicado.bHasta })

  return (
    <div className="space-y-4">
      {/* Presets primero: nadie quiere pelear con dos pares de fechas para pedir
          "este mes contra el anterior". */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => aplicarPreset(p.id)}
            aria-pressed={presetActivo === p.id}
            className={`border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors duration-150 ${
              presetActivo === p.id
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/40'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
        {presetActivo === 'personalizado' ? (
          <span className="border-primary/50 text-muted-foreground border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
            Personalizado
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(
          [
            { titulo: 'Período A', color: COLOR_A, desde: 'aDesde', hasta: 'aHasta' },
            {
              titulo: 'Período B — se compara contra este',
              color: COLOR_B,
              desde: 'bDesde',
              hasta: 'bHasta',
            },
          ] as const
        ).map((p) => (
          <div key={p.titulo} className="border-border bg-surface border p-4">
            <p className="text-muted-foreground mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase">
              <span aria-hidden className="h-2 w-2.5" style={{ backgroundColor: p.color }} />
              {p.titulo}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Desde"
                type="date"
                value={form[p.desde]}
                onChange={(e) => editar(p.desde, e.target.value)}
              />
              <Input
                label="Hasta"
                type="date"
                value={form[p.hasta]}
                onChange={(e) => editar(p.hasta, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {hayCambiosSinAplicar ? (
        <Button onClick={() => setAplicado(form)} disabled={isLoading}>
          {isLoading ? 'Calculando…' : 'Comparar'}
        </Button>
      ) : null}

      {periodoBVacio ? (
        <div className="border-warning/50 bg-warning/5 border p-3">
          <p className="text-xs">
            <span className="font-semibold">El período B no tiene datos posibles.</span> El sistema
            arranca en <strong>noviembre de 2025</strong> — antes de esa fecha no hay ni
            liquidaciones ni facturación migrada, así que va a dar $0,00. Movelo a nov-2025 o
            después para comparar contra algo.
          </p>
        </div>
      ) : null}

      {data ? (
        <div
          className={`border-border bg-surface border transition-opacity duration-200 ${
            isFetching ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <div className="border-border text-muted-foreground border-b px-4 py-2 text-[11px]">
            <strong className="text-foreground">A</strong> {formatDate(aplicado.aDesde)} →{' '}
            {formatDate(aplicado.aHasta)}
            <span className="mx-2">·</span>
            <strong className="text-foreground">B</strong> {formatDate(aplicado.bDesde)} →{' '}
            {formatDate(aplicado.bHasta)}
          </div>

          <FilaMetrica
            rotulo="Ingresos (base)"
            valorA={data.periodoA.total_liquidado}
            valorB={data.periodoB.total_liquidado}
            formato={formatMoney}
          />
          <FilaMetrica
            rotulo="Facturado c/IVA"
            valorA={data.periodoA.total_facturado}
            valorB={data.periodoB.total_facturado}
            formato={formatMoney}
          />
          <FilaMetrica
            rotulo="Comprobantes"
            valorA={data.periodoA.cantidad}
            valorB={data.periodoB.cantidad}
            formato={(n) => String(n)}
          />

          <div className="bg-muted/20 border-border border-t px-4 py-3">
            <p className="text-muted-foreground text-[11px]">
              Diferencia en pesos sobre la base:{' '}
              <strong className="text-foreground tabular-nums">
                {formatMoney(data.periodoA.total_liquidado - data.periodoB.total_liquidado)}
              </strong>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
