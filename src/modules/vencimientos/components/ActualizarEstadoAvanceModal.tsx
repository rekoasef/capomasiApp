'use client'

import { useState } from 'react'
import { useActualizarEstadoAvance } from '../hooks/useVencimientosFiscales'
import { Button } from '@/shared/components/ui/button'
import {
  ESTADO_AVANCE_LABEL,
  type TEstadoAvance,
  type TVencimientoFiscalConCliente,
} from '../types'

type Props = {
  vencimiento: TVencimientoFiscalConCliente
  onClose: () => void
  soloEmpleada?: boolean
}

// APROBADO se muestra en el modal del admin (VencimientosFiscalesOverview)
// pero NO en el flujo de la empleada (MisVencimientosView)
const ESTADOS_ORDENADOS: TEstadoAvance[] = [
  'PENDIENTE',
  'INICIADO',
  'EN_PROCESO',
  'TERMINADO',
  'APROBADO',
]
const ESTADOS_EMPLEADA: TEstadoAvance[] = ['PENDIENTE', 'INICIADO', 'EN_PROCESO', 'TERMINADO']

const ESTADO_DOT: Record<TEstadoAvance, string> = {
  PENDIENTE: 'bg-muted',
  INICIADO: 'bg-warning',
  EN_PROCESO: 'bg-primary',
  TERMINADO: 'bg-success',
  APROBADO: 'bg-success',
}

export function ActualizarEstadoAvanceModal({ vencimiento, onClose, soloEmpleada = false }: Props) {
  const actualizar = useActualizarEstadoAvance()
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<TEstadoAvance>(
    vencimiento.estado_avance
  )
  const [observacion, setObservacion] = useState(vencimiento.observaciones_empleada ?? '')

  const cambio =
    estadoSeleccionado !== vencimiento.estado_avance ||
    observacion !== (vencimiento.observaciones_empleada ?? '')

  const handleConfirmar = async () => {
    const result = await actualizar.mutateAsync({
      id: vencimiento.id,
      estadoAvance: estadoSeleccionado,
      observaciones: observacion || undefined,
    })
    if (result.ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]" onClick={onClose} />
      <div className="border-border bg-surface relative z-10 w-full max-w-sm border p-6 shadow-xl">
        <div className="bg-primary mb-1 h-0.5 w-6" />
        <h2 className="mb-0.5 text-sm font-bold">{vencimiento.descripcion}</h2>
        <p className="text-muted-foreground mb-4 text-xs">
          {vencimiento.clientes?.nombre} · {vencimiento.empleadas?.nombre ?? 'Sin asignar'}
        </p>

        {/* Timeline de estados */}
        <div className="mb-4 space-y-2">
          {(soloEmpleada ? ESTADOS_EMPLEADA : ESTADOS_ORDENADOS).map((estado) => {
            const esCurrent = estado === vencimiento.estado_avance
            const esSeleccionado = estado === estadoSeleccionado
            return (
              <button
                key={estado}
                onClick={() => setEstadoSeleccionado(estado)}
                className={`flex w-full items-center gap-3 rounded-none border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  esSeleccionado
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${ESTADO_DOT[estado]}`} />
                <span className="flex-1">{ESTADO_AVANCE_LABEL[estado]}</span>
                {esCurrent && (
                  <span className="text-muted-foreground text-[10px] tracking-wide">actual</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Observación */}
        <div className="mb-4">
          <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
            Observación
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            placeholder="Ej: presentado el 15/06, pendiente confirmación..."
            className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none border px-3 py-2 text-xs focus:ring-1 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled={!cambio || actualizar.isPending} onClick={handleConfirmar}>
            {actualizar.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
