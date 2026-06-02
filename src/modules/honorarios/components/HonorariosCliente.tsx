'use client'

import { useState } from 'react'
import { TrendingUp, History, ChevronDown, ChevronUp } from 'lucide-react'
import { useHonorarioActivo, useHistorialHonorarios } from '../hooks/useHonorarios'
import { mesesDesdeAjuste, estaVencidoAjuste } from '../services/calcularNuevoHonorario'
import { AplicarAjusteForm } from './AplicarAjusteForm'
import { SetHonorarioForm } from './SetHonorarioForm'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useAuth } from '@/lib/auth/useAuth'
import { formatMoney, formatDate } from '@/shared/utils/formatters'

type Props = { clienteId: string }

export function HonorariosCliente({ clienteId }: Props) {
  const { isAdmin } = useAuth()
  const { data: activo, isLoading: loadingActivo } = useHonorarioActivo(clienteId)
  const { data: historial = [], isLoading: loadingHistorial } = useHistorialHonorarios(clienteId)

  const [showAjuste, setShowAjuste] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)
  const [showSetForm, setShowSetForm] = useState(false)

  const mesesTranscurridos = activo ? mesesDesdeAjuste(activo.vigente_desde) : 0
  const ajusteVencido = activo
    ? estaVencidoAjuste(mesesTranscurridos, activo.frecuencia_ajuste_meses)
    : false

  if (loadingActivo) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Honorario mensual</h3>
      </div>

      {!activo ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sin honorario activo.</p>
          {isAdmin && !showSetForm && (
            <Button size="sm" variant="outline" onClick={() => setShowSetForm(true)}>
              Establecer honorario
            </Button>
          )}
          {isAdmin && showSetForm && (
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <SetHonorarioForm clienteId={clienteId} onSuccess={() => setShowSetForm(false)} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{formatMoney(activo.monto)}</p>
              <p className="text-xs text-muted-foreground">
                Vigente desde {formatDate(activo.vigente_desde)} · {mesesTranscurridos} mes
                {mesesTranscurridos !== 1 ? 'es' : ''} transcurrido
                {mesesTranscurridos !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ajusteVencido && (
                <Badge variant="destructive">Ajuste vencido</Badge>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant={ajusteVencido ? 'default' : 'outline'}
                  onClick={() => setShowAjuste((v) => !v)}
                >
                  Aplicar ajuste
                </Button>
              )}
            </div>
          </div>

          {showAjuste && isAdmin && (
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <AplicarAjusteForm
                clienteId={clienteId}
                montoActual={activo.monto}
                onSuccess={() => setShowAjuste(false)}
              />
            </div>
          )}

          <button
            onClick={() => setShowHistorial((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            {showHistorial ? 'Ocultar historial' : `Ver historial (${historial.length})`}
            {showHistorial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showHistorial && !loadingHistorial && (
            <div className="rounded-md border border-border divide-y divide-border text-sm">
              {historial.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="font-medium">{formatMoney(h.monto)}</span>
                    {h.porcentaje_ajuste && (
                      <span className="ml-2 text-xs text-success">
                        +{h.porcentaje_ajuste}%
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatDate(h.vigente_desde)}</p>
                    {h.vigente_hasta && <p>→ {formatDate(h.vigente_hasta)}</p>}
                    {!h.vigente_hasta && <Badge variant="outline" className="text-[10px]">Activo</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
