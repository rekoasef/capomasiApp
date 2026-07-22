'use client'

import { useMemo, useState } from 'react'
import { useImportarComisionIndividual, useTrabajosRealizados } from '../hooks/useEmpleadas'
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const importar = useImportarComisionIndividual(empleadaId)

  const { data: trabajos = [] } = useTrabajosRealizados(periodoAnio, periodoMes, empleadaId)

  const pendientes = useMemo(
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

  const totalSeleccionado = pendientes
    .filter((t) => selected.has(t.id))
    .reduce((s, t) => s + Number(t.importe_comision ?? 0), 0)

  const allSelected = pendientes.length > 0 && selected.size === pendientes.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pendientes.map((t) => t.id)))
  }

  async function handleImportar() {
    if (selected.size === 0) return
    setImporting(true)
    try {
      for (const trabajo of pendientes.filter((t) => selected.has(t.id))) {
        const r = await importar.mutateAsync(trabajo.id)
        if (!r.ok) return
      }
      setSelected(new Set())
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
          Comisiones por producción de {MESES[periodoMes - 1]} {periodoAnio} pendientes de importar
          a la liquidación.
        </p>

        {/* Totales */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="border-border bg-muted/20 border p-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Seleccionadas
            </p>
            <p className="mt-1 text-lg font-bold">{selected.size}</p>
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
          {!pendientes.length ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No hay comisiones pendientes de importar.
            </p>
          ) : (
            <>
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
                {pendientes.map((t) => (
                  <div
                    key={t.id}
                    className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
                    onClick={() => toggle(t.id)}
                  >
                    <Checkbox checked={selected.has(t.id)} />
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
            disabled={importing || selected.size === 0}
          >
            {importing
              ? 'Importando...'
              : selected.size > 0
                ? `Importar ${selected.size} ${selected.size === 1 ? 'comisión' : 'comisiones'}`
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
