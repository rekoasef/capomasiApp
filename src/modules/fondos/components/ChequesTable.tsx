'use client'

import { useState } from 'react'
import { useCheques, useActualizarEstadoCheque } from '../hooks/useFondos'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { TCheque } from '@/modules/cobranzas/types'

type TEstadoFiltro = TCheque['estado'] | 'TODOS'

const ESTADO_LABEL: Record<TCheque['estado'], string> = {
  EN_CARTERA: 'En cartera',
  DEPOSITADO: 'Depositado',
  ENDOSADO:   'Endosado',
  RECHAZADO:  'Rechazado',
  ANULADO:    'Anulado',
}

const ESTADO_SIGUIENTE: Partial<Record<TCheque['estado'], TCheque['estado'][]>> = {
  EN_CARTERA: ['DEPOSITADO', 'ENDOSADO', 'RECHAZADO', 'ANULADO'],
}

export function ChequesTable() {
  const [filtro, setFiltro] = useState<TEstadoFiltro>('EN_CARTERA')
  const [accionId, setAccionId] = useState<string | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<TCheque['estado'] | ''>('')
  const [fechaCobro, setFechaCobro] = useState('')

  const opts = filtro === 'TODOS' ? {} : { estado: filtro as TCheque['estado'] }
  const { data, isLoading, error } = useCheques(opts)
  const actualizar = useActualizarEstadoCheque()

  const FILTROS: { value: TEstadoFiltro; label: string }[] = [
    { value: 'EN_CARTERA', label: 'En cartera' },
    { value: 'DEPOSITADO', label: 'Depositados' },
    { value: 'ENDOSADO',   label: 'Endosados' },
    { value: 'RECHAZADO',  label: 'Rechazados' },
    { value: 'TODOS',      label: 'Todos' },
  ]

  const handleConfirmarAccion = () => {
    if (!accionId || !nuevoEstado) return
    actualizar.mutate(
      { id: accionId, estado: nuevoEstado, fecha_cobro: fechaCobro || undefined },
      {
        onSuccess: (r) => {
          if (r.ok) {
            setAccionId(null)
            setNuevoEstado('')
            setFechaCobro('')
          }
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-1">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
              filtro === f.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Modal acción */}
      {accionId && (
        <div className="border border-border bg-surface p-4 space-y-3">
          <p className="text-sm font-medium">Cambiar estado del cheque</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Nuevo estado</label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as TCheque['estado'])}
                className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Seleccionar...</option>
                {(ESTADO_SIGUIENTE['EN_CARTERA'] ?? []).map((e) => (
                  <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                ))}
              </select>
            </div>
            {(nuevoEstado === 'DEPOSITADO') && (
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Fecha depósito</label>
                <input
                  type="date"
                  value={fechaCobro}
                  onChange={(e) => setFechaCobro(e.target.value)}
                  className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirmarAccion} disabled={!nuevoEstado || actualizar.isPending}>
              {actualizar.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAccionId(null); setNuevoEstado(''); setFechaCobro('') }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-px">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : !data?.length ? (
        <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin cheques</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">N°</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Banco</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Importe</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">F. Cobro</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Estado</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Tipo</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {data.map((ch) => (
                <tr key={ch.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{ch.numero}</td>
                  <td className="px-4 py-2.5">{ch.banco}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(Number(ch.importe))}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {ch.fecha_cobro ? formatDate(ch.fecha_cobro) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <EstadoBadge estado={ch.estado} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                      {ch.tipo === 'PROPIO' ? 'Propio' : 'Tercero'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {ch.estado === 'EN_CARTERA' && (
                      <button
                        onClick={() => setAccionId(ch.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Actualizar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: TCheque['estado'] }) {
  const colors: Record<TCheque['estado'], string> = {
    EN_CARTERA: 'text-warning',
    DEPOSITADO: 'text-success',
    ENDOSADO:   'text-primary',
    RECHAZADO:  'text-danger',
    ANULADO:    'text-muted-foreground',
  }
  return (
    <span className={`text-[10px] font-bold tracking-widest uppercase ${colors[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  )
}
