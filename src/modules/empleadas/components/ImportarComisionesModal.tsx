'use client'

import { useMemo } from 'react'
import { useImportarComisiones, useTrabajosRealizados } from '../hooks/useEmpleadas'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'

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
  const importar = useImportarComisiones()
  const { data: trabajos = [] } = useTrabajosRealizados(periodoAnio, periodoMes, empleadaId)

  const pendientes = useMemo(
    () =>
      trabajos.filter(
        (trabajo) =>
          !!trabajo.aprobado_at &&
          trabajo.genera_comision &&
          Number(trabajo.importe_comision ?? 0) > 0 &&
          !trabajo.liquidacion_empleada_id
      ),
    [trabajos]
  )

  const total = pendientes.reduce((acc, trabajo) => acc + Number(trabajo.importe_comision ?? 0), 0)

  async function handleImportar() {
    const r = await importar.mutateAsync({
      empleada_id: empleadaId,
      periodo_mes: periodoMes,
      periodo_anio: periodoAnio,
    })
    if (r.ok) onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-base font-semibold">Importar comisiones del mes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se crearán conceptos de tipo <strong>HABER</strong> con concepto <strong>Premio</strong> para todos los trabajos aprobados y no importados.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trabajos a importar</p>
            <p className="mt-1 text-lg font-bold">{pendientes.length}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total comisión</p>
            <p className="mt-1 text-lg font-bold">{formatMoney(total)}</p>
          </div>
        </div>

        <div className="mt-4 max-h-60 overflow-y-auto rounded-md border border-border">
          {pendientes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No hay comisiones pendientes de importar para este período.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {pendientes.map((trabajo) => (
                <div key={trabajo.id} className="px-4 py-3 text-sm">
                  <p className="font-medium">
                    {trabajo.tipo_trabajo}
                    {trabajo.clientes?.nombre ? ` · ${trabajo.clientes.nombre}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{trabajo.descripcion}</p>
                  <p className="mt-1 text-xs font-semibold">{formatMoney(Number(trabajo.importe_comision ?? 0))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={importar.isPending}>
            Cerrar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleImportar}
            disabled={importar.isPending || pendientes.length === 0}
          >
            {importar.isPending ? 'Importando...' : 'Importar a liquidación'}
          </Button>
        </div>
      </div>
    </div>
  )
}
