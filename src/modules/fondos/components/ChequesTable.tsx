'use client'

import { useState } from 'react'
import {
  useCheques,
  useActualizarEstadoCheque,
  useConfirmarAcreditacionCheque,
  useDesmarcarAcreditacionCheque,
} from '../hooks/useFondos'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PaginationControls } from '@/shared/components/PaginationControls'
import type { TCheque } from '@/modules/cobranzas/types'
import { Check, X, Clock3, ArrowRightLeft, Ban, CheckCircle2, CircleDashed } from 'lucide-react'

const PAGE_SIZE = 25

type TEstadoFiltro = TCheque['estado'] | 'TODOS'

const ESTADO_LABEL: Record<TCheque['estado'], string> = {
  EN_CARTERA: 'En cartera',
  DEPOSITADO: 'Depositado',
  ENDOSADO: 'Endosado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
}

const ESTADO_SIGUIENTE: Partial<Record<TCheque['estado'], TCheque['estado'][]>> = {
  EN_CARTERA: ['DEPOSITADO', 'ENDOSADO', 'RECHAZADO', 'ANULADO'],
}

export function ChequesTable() {
  const [filtro, setFiltro] = useState<TEstadoFiltro>('EN_CARTERA')
  const [accionId, setAccionId] = useState<string | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<TCheque['estado'] | ''>('')
  const [fechaCobro, setFechaCobro] = useState('')
  const [page, setPage] = useState(0)

  const opts = {
    ...(filtro === 'TODOS' ? {} : { estado: filtro as TCheque['estado'] }),
    page,
    pageSize: PAGE_SIZE,
  }
  const { data: chequesData, isLoading, error } = useCheques(opts)
  const data = chequesData?.rows
  const actualizar = useActualizarEstadoCheque()
  const confirmarAcreditacion = useConfirmarAcreditacionCheque()
  const desmarcarAcreditacion = useDesmarcarAcreditacionCheque()

  const FILTROS: { value: TEstadoFiltro; label: string }[] = [
    { value: 'EN_CARTERA', label: 'En cartera' },
    { value: 'DEPOSITADO', label: 'Depositados' },
    { value: 'ENDOSADO', label: 'Endosados' },
    { value: 'RECHAZADO', label: 'Rechazados' },
    { value: 'TODOS', label: 'Todos' },
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
            onClick={() => {
              setFiltro(f.value)
              setPage(0)
            }}
            className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
        <div className="border-border bg-surface space-y-3 border p-4">
          <p className="text-sm font-medium">Cambiar estado del cheque</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Nuevo estado
              </label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as TCheque['estado'])}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                {(ESTADO_SIGUIENTE['EN_CARTERA'] ?? []).map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_LABEL[e]}
                  </option>
                ))}
              </select>
            </div>
            {nuevoEstado === 'DEPOSITADO' && (
              <div>
                <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                  Fecha depósito
                </label>
                <input
                  type="date"
                  value={fechaCobro}
                  onChange={(e) => setFechaCobro(e.target.value)}
                  className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirmarAccion}
              disabled={!nuevoEstado || actualizar.isPending}
            >
              {actualizar.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAccionId(null)
                setNuevoEstado('')
                setFechaCobro('')
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin cheques
        </p>
      ) : (
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b-2">
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  N°
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Banco
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Importe
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  F. Cobro
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Estado
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Tipo
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-center text-[10px] font-bold tracking-[0.14em] uppercase">
                  Acreditado
                </th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {data.map((ch) => (
                <tr key={ch.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{ch.numero}</td>
                  <td className="px-4 py-2.5">{ch.banco}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatMoney(Number(ch.importe))}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                    {ch.fecha_cobro ? formatDate(ch.fecha_cobro) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <EstadoBadge estado={ch.estado} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                      {ch.tipo === 'PROPIO' ? 'Propio' : 'Tercero'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <AcreditacionToggle
                      cheque={ch}
                      isPending={confirmarAcreditacion.isPending || desmarcarAcreditacion.isPending}
                      onConfirmar={() => confirmarAcreditacion.mutate(ch.id)}
                      onDesmarcar={() => desmarcarAcreditacion.mutate(ch.id)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {ch.estado === 'EN_CARTERA' && (
                      <button
                        onClick={() => setAccionId(ch.id)}
                        className="text-primary text-xs hover:underline"
                      >
                        Actualizar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            total={chequesData?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}

const ESTADOS_CONFIRMABLES: TCheque['estado'][] = ['DEPOSITADO', 'ENDOSADO', 'RECHAZADO']

function AcreditacionToggle({
  cheque,
  isPending,
  onConfirmar,
  onDesmarcar,
}: {
  cheque: TCheque
  isPending: boolean
  onConfirmar: () => void
  onDesmarcar: () => void
}) {
  if (!ESTADOS_CONFIRMABLES.includes(cheque.estado)) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  if (cheque.acreditacion_confirmada) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={onDesmarcar}
        title="Acreditación confirmada — click para desmarcar"
        className="text-success inline-flex items-center justify-center disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onConfirmar}
      title="Sin confirmar — click para marcar como acreditado"
      className="text-danger inline-flex items-center justify-center disabled:opacity-50"
    >
      <CircleDashed className="h-4 w-4" />
    </button>
  )
}

const ESTADO_ICON: Record<TCheque['estado'], typeof Check> = {
  EN_CARTERA: Clock3,
  DEPOSITADO: Check,
  ENDOSADO: ArrowRightLeft,
  RECHAZADO: X,
  ANULADO: Ban,
}

function EstadoBadge({ estado }: { estado: TCheque['estado'] }) {
  const colors: Record<TCheque['estado'], string> = {
    EN_CARTERA: 'text-warning border-warning/40 bg-warning/10',
    DEPOSITADO: 'text-success border-success/40 bg-success/10',
    ENDOSADO: 'text-primary border-primary/40 bg-primary/10',
    RECHAZADO: 'text-danger border-danger/40 bg-danger/10',
    ANULADO: 'text-muted-foreground border-border bg-muted/20',
  }
  const Icon = ESTADO_ICON[estado]
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${colors[estado]}`}
    >
      <Icon className="h-3 w-3" />
      {ESTADO_LABEL[estado]}
    </span>
  )
}
