'use client'

import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { TEstadoAvance, TVencimientoFiscalConCliente } from '../types'

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
    </div>
  )
}
