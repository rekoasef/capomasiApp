'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  useVencimientosFiscales,
  useEliminarVencimientoFiscal,
  useGenerarVencimientosMes,
} from '../hooks/useVencimientosFiscales'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { VencimientoFiscalForm } from './VencimientoFiscalForm'
import { ActualizarEstadoAvanceModal } from './ActualizarEstadoAvanceModal'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate } from '@/shared/utils/formatters'
import { Plus, ChevronDown, Trash2, CheckCircle2, Clock, List, CalendarDays } from 'lucide-react'
import {
  ESTADO_AVANCE_LABEL,
  type TEstadoAvance,
  type TVencimientoFiscalConCliente,
} from '../types'

const CalendarioVencimientos = dynamic(
  () => import('./CalendarioVencimientos').then((m) => m.CalendarioVencimientos),
  { ssr: false, loading: () => <Skeleton className="h-[620px] w-full rounded-none" /> }
)

type Vista = 'lista' | 'calendario'

const ESTADO_VARIANT: Record<TEstadoAvance, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE: 'outline',
  INICIADO: 'secondary',
  EN_PROCESO: 'secondary',
  TERMINADO: 'default',
  APROBADO: 'default',
}

const ESTADO_COLOR: Record<TEstadoAvance, string> = {
  PENDIENTE: 'text-muted-foreground',
  INICIADO: 'text-warning',
  EN_PROCESO: 'text-primary',
  TERMINADO: 'text-success',
  APROBADO: 'text-success',
}

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

const HOY = new Date()

export function VencimientosFiscalesOverview() {
  const anioActual = HOY.getFullYear()
  const mesActual = HOY.getMonth() + 1

  const [anio, setAnio] = useState(anioActual)
  const [mes, setMes] = useState(mesActual)
  const [vista, setVista] = useState<Vista>('lista')
  const [empleadaFiltro, setEmpleadaFiltro] = useState<string>('TODOS')
  const [filtroChip, setFiltroChip] = useState<TEstadoAvance | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<TVencimientoFiscalConCliente | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Sin filtro de estado en el servidor — se filtra client-side para que los chips muestren conteos reales
  const {
    data: todos = [],
    isLoading,
    error,
  } = useVencimientosFiscales({
    anio,
    mes,
    empleadaId: empleadaFiltro !== 'TODOS' ? empleadaFiltro : undefined,
  })
  const eliminar = useEliminarVencimientoFiscal()
  const generar = useGenerarVencimientosMes()
  const { data: empleadas = [] } = useEmpleadas()

  useEffect(() => {
    generar.mutate({ anio, mes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes])

  // Reset del chip de filtro al cambiar de período, calculado durante el render
  // (evita el setState síncrono dentro de un efecto)
  const [prevPeriodo, setPrevPeriodo] = useState<[number, number]>([anio, mes])
  if (prevPeriodo[0] !== anio || prevPeriodo[1] !== mes) {
    setPrevPeriodo([anio, mes])
    setFiltroChip(null)
  }

  const anios = Array.from({ length: 3 }, (_, i) => anioActual - 1 + i)

  const resumen = todos.reduce<Record<TEstadoAvance, number>>(
    (acc, v) => {
      acc[v.estado_avance] = (acc[v.estado_avance] ?? 0) + 1
      return acc
    },
    { PENDIENTE: 0, INICIADO: 0, EN_PROCESO: 0, TERMINADO: 0, APROBADO: 0 }
  )

  const DONE = new Set<string>(['TERMINADO', 'APROBADO'])

  // TERMINADO y APROBADO se agrupan en el mismo chip desde la perspectiva del seguimiento
  const chips: { key: TEstadoAvance; label: string; estados: TEstadoAvance[]; count: number }[] = [
    { key: 'PENDIENTE', label: 'Pendiente', estados: ['PENDIENTE'], count: resumen.PENDIENTE },
    { key: 'INICIADO', label: 'Iniciado', estados: ['INICIADO'], count: resumen.INICIADO },
    { key: 'EN_PROCESO', label: 'En proceso', estados: ['EN_PROCESO'], count: resumen.EN_PROCESO },
    {
      key: 'TERMINADO',
      label: 'Terminado',
      estados: ['TERMINADO', 'APROBADO'],
      count: resumen.TERMINADO + resumen.APROBADO,
    },
  ]

  const chipActivo = chips.find((c) => c.key === filtroChip)
  const data = chipActivo
    ? todos.filter((v) => chipActivo.estados.includes(v.estado_avance))
    : todos

  const vencidos = todos.filter(
    (v) => !DONE.has(v.estado_avance) && v.fecha_vencimiento < HOY.toISOString().slice(0, 10)
  ).length

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Año */}
        <div className="flex gap-1">
          {anios.map((a) => (
            <button
              key={a}
              onClick={() => setAnio(a)}
              className={`border px-2.5 py-1 text-xs font-semibold transition-colors ${
                a === anio
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Mes */}
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="border-border bg-surface text-foreground focus:ring-primary border px-2.5 py-1 text-xs font-medium focus:ring-1 focus:outline-none"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>

        {/* Empleada */}
        <select
          value={empleadaFiltro}
          onChange={(e) => setEmpleadaFiltro(e.target.value)}
          className="border-border bg-surface text-foreground focus:ring-primary border px-2.5 py-1 text-xs font-medium focus:ring-1 focus:outline-none"
        >
          <option value="TODOS">Todas las empleadas</option>
          {empleadas
            .filter((e) => e.activo)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle lista / calendario */}
          <div className="border-border flex border">
            <button
              onClick={() => setVista('lista')}
              title="Vista lista"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors ${
                vista === 'lista'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <div className="bg-border w-px" />
            <button
              onClick={() => setVista('calendario')}
              title="Vista calendario"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors ${
                vista === 'calendario'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendario
            </button>
          </div>

          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Resumen chips — filtros client-side */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const activo = filtroChip === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFiltroChip(activo ? null : chip.key)}
                className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors ${
                  activo
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`font-bold ${activo ? 'text-primary' : 'text-foreground'}`}>
                  {chip.count}
                </span>
              </button>
            )
          })}
          {vencidos > 0 && (
            <div className="border-danger/40 bg-danger/5 text-danger flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium">
              <Clock className="h-3 w-3" />
              <span>
                {vencidos} vencido{vencidos !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin vencimientos para {MESES[mes - 1]} {anio}
        </p>
      ) : vista === 'calendario' ? (
        <CalendarioVencimientos data={data} anio={anio} mes={mes} onSelect={setEditando} />
      ) : (
        <div className="border-border divide-border divide-y border">
          {data.map((v) => {
            const esVencido =
              !DONE.has(v.estado_avance) && v.fecha_vencimiento < HOY.toISOString().slice(0, 10)
            return (
              <div
                key={v.id}
                className="bg-surface hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{v.clientes?.nombre ?? '—'}</span>
                    <span className="text-muted-foreground text-xs">{v.descripcion}</span>
                    {v.empleadas && (
                      <span className="text-muted-foreground border-border border px-1.5 py-0.5 text-[10px] tracking-wide">
                        {v.empleadas.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium tabular-nums ${esVencido ? 'text-danger' : 'text-muted-foreground'}`}
                    >
                      {esVencido && <Clock className="-mt-px mr-0.5 inline h-3 w-3" />}
                      {formatDate(v.fecha_vencimiento)}
                    </span>
                    {v.observaciones_empleada && (
                      <span className="text-muted-foreground max-w-xs truncate text-[11px] italic">
                        &quot;{v.observaciones_empleada}&quot;
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {v.facturado && <CheckCircle2 className="text-success h-3.5 w-3.5" />}
                  <Badge variant={ESTADO_VARIANT[v.estado_avance]}>
                    <span className={ESTADO_COLOR[v.estado_avance]}>
                      {ESTADO_AVANCE_LABEL[v.estado_avance]}
                    </span>
                  </Badge>
                  <button
                    title="Actualizar estado"
                    onClick={() => setEditando(v)}
                    className="text-muted-foreground hover:text-primary p-1"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Eliminar"
                    onClick={() => setDeleteId(v.id)}
                    className="text-muted-foreground hover:text-danger p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo vencimiento */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={() => setShowForm(false)}
          />
          <div className="border-border bg-surface relative z-10 w-full max-w-md border p-6 shadow-xl">
            <div className="bg-primary mb-1 h-0.5 w-6" />
            <h2 className="mb-4 text-sm font-bold">Nuevo vencimiento</h2>
            <VencimientoFiscalForm
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Modal actualizar estado */}
      {editando && (
        <ActualizarEstadoAvanceModal vencimiento={editando} onClose={() => setEditando(null)} />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar vencimiento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) eliminar.mutate(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
