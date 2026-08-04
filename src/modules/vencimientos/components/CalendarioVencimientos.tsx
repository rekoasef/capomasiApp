'use client'

import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Button } from '@/shared/components/ui/button'
import {
  ESTADO_AVANCE_LABEL,
  type TEstadoAvance,
  type TVencimientoFiscalConCliente,
} from '../types'

// dateFnsLocalizer envuelve estas funciones internamente con { locale }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { es },
})

const ESTADO_BG: Record<TEstadoAvance, string> = {
  PENDIENTE: '#94A3B8',
  INICIADO: '#EAB308',
  EN_PROCESO: '#3B82F6',
  TERMINADO: '#22C55E',
  APROBADO: '#22C55E',
}

type CalEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: TVencimientoFiscalConCliente
}

type Props = {
  data: TVencimientoFiscalConCliente[]
  anio: number
  mes: number
  empleadaId?: string
  onSelect: (v: TVencimientoFiscalConCliente) => void
}

export function CalendarioVencimientos({ data, anio, mes, empleadaId, onSelect }: Props) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)

  const trabajosDelDia = useMemo(() => {
    if (!diaSeleccionado) return []
    const fechaStr = format(diaSeleccionado, 'yyyy-MM-dd')
    return data.filter((v) => v.fecha_vencimiento === fechaStr)
  }, [diaSeleccionado, data])

  const events: CalEvent[] = useMemo(
    () =>
      data.map((v) => {
        const [y, m, d] = v.fecha_vencimiento.split('-').map(Number)
        const fecha = new Date(y, m - 1, d)
        return {
          id: v.id,
          title: `${v.clientes?.nombre ?? '?'} · ${v.descripcion}`,
          start: fecha,
          end: fecha,
          resource: v,
        }
      }),
    [data]
  )

  const defaultDate = useMemo(() => new Date(anio, mes - 1, 1), [anio, mes])

  return (
    <div className="rbc-capomasi">
      <Calendar<CalEvent>
        localizer={localizer}
        events={events}
        defaultView={'month' as View}
        date={defaultDate}
        onNavigate={() => {
          /* controlado por los selectores de año/mes externos */
        }}
        onDrillDown={(date) => setDiaSeleccionado(date)}
        toolbar={false}
        style={{ height: 620 }}
        culture="es"
        eventPropGetter={(event) => {
          const v = event.resource
          const esMio = !empleadaId || v.empleada_id === empleadaId
          const esVencido =
            v.estado_avance === 'PENDIENTE' &&
            v.fecha_vencimiento < new Date().toISOString().slice(0, 10)
          return {
            style: {
              backgroundColor: esVencido ? '#EF4444' : ESTADO_BG[v.estado_avance],
              opacity: esMio ? 1 : 0.45,
              border: 'none',
              borderRadius: 2,
              fontSize: '11px',
              fontWeight: 500,
              padding: '1px 5px',
              cursor:
                esMio && v.estado_avance !== 'TERMINADO' && v.estado_avance !== 'APROBADO'
                  ? 'pointer'
                  : 'default',
            },
          }
        }}
        onSelectEvent={(event) => {
          const v = event.resource
          const esMio = !empleadaId || v.empleada_id === empleadaId
          if (esMio && v.estado_avance !== 'TERMINADO' && v.estado_avance !== 'APROBADO') {
            onSelect(v)
          }
        }}
        messages={{
          noEventsInRange: 'Sin vencimientos en este período',
          showMore: (total: number) => `+ ${total} más`,
        }}
      />

      {diaSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={() => setDiaSeleccionado(null)}
          />
          <div className="border-border bg-surface relative z-10 flex max-h-[80vh] w-full max-w-sm flex-col border p-6 shadow-xl">
            <div className="bg-primary mb-1 h-0.5 w-6" />
            <h2 className="mb-1 text-sm font-bold capitalize">
              {format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <p className="text-muted-foreground mb-4 text-xs">
              {trabajosDelDia.length} trabajo{trabajosDelDia.length !== 1 ? 's' : ''} vence
              {trabajosDelDia.length !== 1 ? 'n' : ''} este día
            </p>

            {trabajosDelDia.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                Sin trabajos para este día
              </p>
            ) : (
              <div className="divide-border -mx-2 flex-1 divide-y overflow-y-auto">
                {trabajosDelDia.map((v) => {
                  const esMio = !empleadaId || v.empleada_id === empleadaId
                  const editable = v.estado_avance !== 'TERMINADO' && v.estado_avance !== 'APROBADO'
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!esMio || !editable}
                      onClick={() => {
                        onSelect(v)
                        setDiaSeleccionado(null)
                      }}
                      className="hover:bg-muted/30 w-full px-2 py-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <p className="text-sm font-medium">{v.clientes?.nombre ?? '—'}</p>
                      <p className="text-muted-foreground text-xs">
                        {v.tipo_vencimiento.replace(/_/g, ' ')}
                        {v.descripcion ? ` · ${v.descripcion}` : ''}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">
                          {v.empleadas
                            ? `${v.empleadas.nombre}${v.empleadas.apellido ? ' ' + v.empleadas.apellido : ''}`
                            : 'Sin asignar'}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          · {ESTADO_AVANCE_LABEL[v.estado_avance]}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setDiaSeleccionado(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
