'use client'

import { useMemo, useState } from 'react'
import {
  useImportarComisionIndividual,
  useTrabajosRealizados,
  useComisionesRegistradas,
  useLiquidarComision,
} from '../hooks/useEmpleadas'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'

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

type Props = {
  open: boolean
  onClose: () => void
  empleadaId: string
  periodoMes: number
  periodoAnio: number
}

export function ImportarComisionesModal({
  open,
  onClose,
  empleadaId,
  periodoMes,
  periodoAnio,
}: Props) {
  const [selectedPuntaje, setSelectedPuntaje] = useState<Set<string>>(new Set())
  const [selectedProduccion, setSelectedProduccion] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const importarProduccion = useImportarComisionIndividual(empleadaId)
  const liquidarPuntaje = useLiquidarComision(empleadaId)

  const { data: trabajos = [] } = useTrabajosRealizados(periodoAnio, periodoMes, empleadaId)
  const { data: comisionesPuntaje = [] } = useComisionesRegistradas(empleadaId)

  const pendientesProduccion = useMemo(
    () =>
      trabajos.filter(
        (t) =>
          !!t.aprobado_at &&
          t.genera_comision &&
          Number(t.importe_comision ?? 0) > 0 &&
          !t.liquidacion_empleada_id
      ),
    [trabajos]
  )

  const pendientesPuntaje = useMemo(
    () => comisionesPuntaje.filter((c) => c.estado === 'PENDIENTE'),
    [comisionesPuntaje]
  )

  const hayPendientes = pendientesProduccion.length > 0 || pendientesPuntaje.length > 0

  const totalSeleccionado =
    pendientesPuntaje
      .filter((c) => selectedPuntaje.has(c.id))
      .reduce((s, c) => s + Number(c.importe), 0) +
    pendientesProduccion
      .filter((t) => selectedProduccion.has(t.id))
      .reduce((s, t) => s + Number(t.importe_comision ?? 0), 0)

  const totalSeleccionados = selectedPuntaje.size + selectedProduccion.size

  function togglePuntaje(id: string) {
    setSelectedPuntaje((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleProduccion(id: string) {
    setSelectedProduccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (
      selectedPuntaje.size === pendientesPuntaje.length &&
      selectedProduccion.size === pendientesProduccion.length
    ) {
      setSelectedPuntaje(new Set())
      setSelectedProduccion(new Set())
    } else {
      setSelectedPuntaje(new Set(pendientesPuntaje.map((c) => c.id)))
      setSelectedProduccion(new Set(pendientesProduccion.map((t) => t.id)))
    }
  }

  const allSelected =
    pendientesPuntaje.length > 0 &&
    selectedPuntaje.size === pendientesPuntaje.length &&
    selectedProduccion.size === pendientesProduccion.length

  async function handleImportar() {
    if (totalSeleccionados === 0) return
    setImporting(true)
    try {
      for (const trabajo of pendientesProduccion.filter((t) => selectedProduccion.has(t.id))) {
        const r = await importarProduccion.mutateAsync(trabajo.id)
        if (!r.ok) return
      }
      // Importar comisiones de puntaje seleccionadas
      for (const id of selectedPuntaje) {
        const r = await liquidarPuntaje.mutateAsync(id)
        if (!r.ok) return
      }
      setSelectedPuntaje(new Set())
      setSelectedProduccion(new Set())
      onClose()
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="border-border bg-surface relative z-10 w-full max-w-xl border p-6 shadow-lg">
        <h2 className="text-base font-semibold">Importar comisiones</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Seleccioná las comisiones que querés importar a la liquidación.
        </p>

        {/* Totales */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="border-border bg-muted/20 border p-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Seleccionadas
            </p>
            <p className="mt-1 text-lg font-bold">{totalSeleccionados}</p>
          </div>
          <div className="border-primary/30 bg-primary/5 border p-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Total a importar
            </p>
            <p className="text-primary mt-1 text-lg font-bold">{formatMoney(totalSeleccionado)}</p>
          </div>
        </div>

        {/* Lista */}
        <div className="border-border mt-4 overflow-hidden border">
          {!hayPendientes ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No hay comisiones pendientes de importar.
            </p>
          ) : (
            <>
              {/* Seleccionar todo */}
              <div
                className="border-border bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center gap-3 border-b px-4 py-2.5"
                onClick={toggleAll}
              >
                <Checkbox checked={allSelected} />
                <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Seleccionar todas
                </span>
              </div>

              <div className="divide-border max-h-64 divide-y overflow-y-auto">
                {/* Puntaje */}
                {pendientesPuntaje.length > 0 && (
                  <>
                    <div className="bg-muted/20 px-4 py-1.5">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                        Por puntaje
                      </p>
                    </div>
                    {pendientesPuntaje.map((c) => (
                      <div
                        key={c.id}
                        className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
                        onClick={() => togglePuntaje(c.id)}
                      >
                        <Checkbox checked={selectedPuntaje.has(c.id)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            Comisión por objetivos — {MESES[c.periodo_mes - 1]} {c.periodo_anio}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {Number(c.puntos_total).toFixed(2)} pts acumulados
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(c.importe)}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {/* Producción */}
                {pendientesProduccion.length > 0 && (
                  <>
                    <div className="bg-muted/20 px-4 py-1.5">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                        Por producción — {MESES[periodoMes - 1]} {periodoAnio}
                      </p>
                    </div>
                    {pendientesProduccion.map((t) => (
                      <div
                        key={t.id}
                        className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
                        onClick={() => toggleProduccion(t.id)}
                      >
                        <Checkbox checked={selectedProduccion.has(t.id)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {t.tipo_trabajo}
                            {t.clientes?.nombre ? ` · ${t.clientes.nombre}` : ''}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">{t.descripcion}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(Number(t.importe_comision ?? 0))}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={importing}>
            Cerrar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleImportar}
            disabled={importing || totalSeleccionados === 0}
          >
            {importing
              ? 'Importando...'
              : totalSeleccionados > 0
                ? `Importar ${totalSeleccionados} ${totalSeleccionados === 1 ? 'comisión' : 'comisiones'}`
                : 'Importar a liquidación'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 transition-colors ${
        checked ? 'border-primary bg-primary' : 'border-border bg-surface'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
          <polyline points="1,4 4,7 9,1" />
        </svg>
      )}
    </div>
  )
}
