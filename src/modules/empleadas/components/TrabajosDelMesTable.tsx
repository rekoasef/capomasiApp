'use client'

import { useState } from 'react'
import { useAprobarTrabajo } from '../hooks/useEmpleadas'
import type { TTrabajoRealizadoDetalle } from '../types'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate, formatMoney } from '@/shared/utils/formatters'

type Props = {
  items: TTrabajoRealizadoDetalle[]
  isLoading?: boolean
  isAdmin?: boolean
}

export function TrabajosDelMesTable({ items, isLoading = false, isAdmin = false }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">
        Sin trabajos cargados para este período
      </p>
    )
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Fecha</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Empleada</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Cliente</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Trabajo</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Descripción</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Estado</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Comisión</th>
            {isAdmin && <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Acción</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {items.map((item) => (
            <TrabajoRow key={item.id} item={item} isAdmin={isAdmin} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TrabajoRow({ item, isAdmin }: { item: TTrabajoRealizadoDetalle; isAdmin: boolean }) {
  const aprobar = useAprobarTrabajo()
  const esPuntaje = item.empleadas?.tipo_comision === 'PUNTAJE'
  const [generaComision, setGeneraComision] = useState(item.genera_comision)
  const [importeComision, setImporteComision] = useState(item.importe_comision?.toString() ?? '')

  async function handleAprobar() {
    const payload = esPuntaje
      ? { trabajo_id: item.id, genera_comision: false, importe_comision: null }
      : {
          trabajo_id: item.id,
          genera_comision: generaComision,
          importe_comision: generaComision ? Number(importeComision || 0) : null,
        }
    const r = await aprobar.mutateAsync(payload)
    if (r.ok && !esPuntaje) {
      setGeneraComision(r.data.genera_comision)
      setImporteComision(r.data.importe_comision?.toString() ?? '')
    }
  }

  const aprobado = !!item.aprobado_at

  return (
    <tr className="align-top hover:bg-muted/30 transition-colors">
      <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(item.fecha)}</td>
      <td className="px-4 py-2.5 font-medium">{item.empleadas?.nombre ?? '—'}</td>
      <td className="px-4 py-2.5">{item.clientes?.nombre ?? '—'}</td>
      <td className="px-4 py-2.5">{item.tipo_trabajo}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{item.descripcion}</td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {aprobado ? (
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-success">Aprobado</span>
            {item.liquidacion_empleada_id && (
              <p className="text-[11px] text-muted-foreground">Importado a liquidación</p>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-bold tracking-widest uppercase text-warning">Pendiente</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {aprobado ? (
          esPuntaje ? (
            <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Pts auto</span>
          ) : item.genera_comision && item.importe_comision !== null ? (
            formatMoney(Number(item.importe_comision))
          ) : (
            'Sin comisión'
          )
        ) : isAdmin && !esPuntaje ? (
          <div className="flex min-w-[180px] items-center justify-end gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={generaComision}
                onChange={(e) => setGeneraComision(e.target.checked)}
                disabled={aprobar.isPending}
              />
              Comisión
            </label>
            <Input
              id={`comision_${item.id}`}
              type="number"
              step="0.01"
              min="0"
              className="w-28"
              value={importeComision}
              onChange={(e) => setImporteComision(e.target.value)}
              disabled={!generaComision || aprobar.isPending}
            />
          </div>
        ) : (
          '—'
        )}
      </td>
      {isAdmin && (
        <td className="px-4 py-2.5 text-right">
          {!aprobado ? (
            <Button type="button" size="sm" onClick={handleAprobar} disabled={aprobar.isPending}>
              {aprobar.isPending ? 'Guardando...' : 'Aprobar'}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}
    </tr>
  )
}
