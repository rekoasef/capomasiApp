'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth/useAuth'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import {
  useVencimientosFiscales,
  useGenerarVencimientosMes,
} from '../hooks/useVencimientosFiscales'
import { ActualizarEstadoAvanceModal } from './ActualizarEstadoAvanceModal'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate } from '@/shared/utils/formatters'
import { Clock, CheckCircle2, ChevronRight, List, CalendarDays } from 'lucide-react'
import {
  ESTADO_AVANCE_LABEL,
  ESTADO_AVANCE_SIGUIENTE,
  type TEstadoAvance,
  type TVencimientoFiscalConCliente,
} from '../types'

// Carga dinámica para evitar SSR (react-big-calendar usa APIs del browser)
const CalendarioVencimientos = dynamic(
  () => import('./CalendarioVencimientos').then((m) => m.CalendarioVencimientos),
  { ssr: false, loading: () => <Skeleton className="h-[620px] w-full rounded-none" /> }
)

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

const ESTADO_VARIANT: Record<TEstadoAvance, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE: 'outline',
  INICIADO: 'secondary',
  EN_PROCESO: 'secondary',
  TERMINADO: 'default',
  APROBADO: 'default',
}

const DONE = new Set<string>(['TERMINADO', 'APROBADO'])
const HOY = new Date()

type Vista = 'lista' | 'calendario'

export function MisVencimientosView() {
  const { user } = useAuth()
  const { data: empleadas = [] } = useEmpleadas()

  const empleadaPropia = useMemo(
    () => empleadas.find((e) => e.usuario_id === user?.id),
    [empleadas, user?.id]
  )

  const anioActual = HOY.getFullYear()
  const mesActual = HOY.getMonth() + 1

  const [anio, setAnio] = useState(anioActual)
  const [mes, setMes] = useState(mesActual)
  const [vista, setVista] = useState<Vista>('lista')
  const [editando, setEditando] = useState<TVencimientoFiscalConCliente | null>(null)
  const [soloMios, setSoloMios] = useState(false)
  const [filtroChip, setFiltroChip] = useState<TEstadoAvance | null>(null)

  const { data: todos = [], isLoading, error } = useVencimientosFiscales({ anio, mes })
  const generar = useGenerarVencimientosMes()

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

  const data = useMemo(() => {
    if (!soloMios || !empleadaPropia) return todos
    return todos.filter((v) => v.empleada_id === empleadaPropia.id)
  }, [todos, soloMios, empleadaPropia])

  const anios = [anioActual - 1, anioActual, anioActual + 1]

  const resumen = data.reduce<Record<TEstadoAvance, number>>(
    (acc, v) => {
      acc[v.estado_avance] = (acc[v.estado_avance] ?? 0) + 1
      return acc
    },
    { PENDIENTE: 0, INICIADO: 0, EN_PROCESO: 0, TERMINADO: 0, APROBADO: 0 }
  )

  // Para la empleada, TERMINADO y APROBADO son lo mismo: trabajo hecho.
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

  const dataFiltrada = chipActivo
    ? data.filter((v) => chipActivo.estados.includes(v.estado_avance))
    : data

  const vencidos = data.filter(
    (v) => !DONE.has(v.estado_avance) && v.fecha_vencimiento < HOY.toISOString().slice(0, 10)
  ).length

  if (!empleadaPropia && !isLoading) {
    return (
      <div className="border-border bg-surface border p-6">
        <p className="text-sm font-semibold">Sin perfil de empleada</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Tu usuario no tiene un perfil de empleada asociado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controles */}
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

        {/* Solo mis asignados */}
        <button
          onClick={() => setSoloMios((v) => !v)}
          className={`border px-2.5 py-1 text-xs font-semibold transition-colors ${
            soloMios
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
          }`}
        >
          Solo mis asignados
        </button>

        {/* Toggle lista / calendario */}
        <div className="border-border ml-auto flex border">
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
      </div>

      {/* Resumen chips — funcionan como filtros */}
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
              {vencidos} vencido{vencidos !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !dataFiltrada.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          {filtroChip
            ? `Sin trabajos "${chips.find((c) => c.key === filtroChip)?.label}" para ${MESES[mes - 1]} ${anio}`
            : `Sin obligaciones para ${MESES[mes - 1]} ${anio}`}
        </p>
      ) : vista === 'calendario' ? (
        <CalendarioVencimientos
          data={dataFiltrada}
          anio={anio}
          mes={mes}
          empleadaId={empleadaPropia?.id}
          onSelect={setEditando}
        />
      ) : (
        <div className="border-border divide-border divide-y border">
          {dataFiltrada.map((v) => {
            const esVencido =
              !DONE.has(v.estado_avance) && v.fecha_vencimiento < HOY.toISOString().slice(0, 10)
            const esMio = v.empleada_id === empleadaPropia?.id
            const terminado = DONE.has(v.estado_avance)
            const siguienteEstado = ESTADO_AVANCE_SIGUIENTE[v.estado_avance]

            return (
              <div
                key={v.id}
                className={`bg-surface hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors ${
                  !esMio || terminado ? 'opacity-50' : ''
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{v.clientes?.nombre ?? '—'}</span>
                    <span className="text-muted-foreground text-xs">{v.descripcion}</span>
                    {!esMio && v.empleadas && (
                      <span className="border-border text-muted-foreground border px-1.5 py-0.5 text-[10px]">
                        {v.empleadas.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] tabular-nums ${esVencido ? 'text-danger font-medium' : 'text-muted-foreground'}`}
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
                  {v.facturado ? (
                    <CheckCircle2 className="text-success h-4 w-4" />
                  ) : (
                    <Badge variant={ESTADO_VARIANT[v.estado_avance]}>
                      {ESTADO_AVANCE_LABEL[v.estado_avance]}
                    </Badge>
                  )}
                  {esMio && !v.facturado && !terminado && (
                    <button
                      title={
                        siguienteEstado
                          ? `Pasar a ${ESTADO_AVANCE_LABEL[siguienteEstado]}`
                          : 'Ver / editar'
                      }
                      onClick={() => setEditando(v)}
                      className="text-muted-foreground hover:text-primary p-1 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editando && (
        <ActualizarEstadoAvanceModal
          vencimiento={editando}
          onClose={() => setEditando(null)}
          soloEmpleada
        />
      )}
    </div>
  )
}
