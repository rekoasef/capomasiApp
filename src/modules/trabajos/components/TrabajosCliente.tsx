'use client'

import { useState } from 'react'
import {
  useTrabajosCliente,
  useAvanzarEstado,
  useRetrocederEstado,
  useEliminarTrabajo,
} from '../hooks/useTrabajos'
import { TrabajoForm } from './TrabajoForm'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { calcularImporteFacturado } from '@/modules/cobranzas/services/calcularImporteFacturado'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import { useParametros } from '@/shared/hooks/useParametros'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { FALLBACK_TIPOS_COMPROBANTE } from '@/shared/lib/parametros'
import { Plus, ChevronRight, ChevronLeft, Trash2, Calendar, User } from 'lucide-react'
import { ESTADO_LABEL, ESTADO_SIGUIENTE, type TTrabajo } from '../types'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE: 'outline',
  EN_PROCESO: 'secondary',
  FINALIZADO: 'default',
  COBRADO: 'default',
}

type Props = { clienteId: string }

export function TrabajosCliente({ clienteId }: Props) {
  const { data, isLoading, error } = useTrabajosCliente(clienteId)
  const avanzar = useAvanzarEstado()
  const retroceder = useRetrocederEstado()
  const eliminar = useEliminarTrabajo()
  const { isAdmin } = useAuth()
  const { data: empleadas = [] } = useEmpleadas()
  const { data: tiposComprobante = FALLBACK_TIPOS_COMPROBANTE } = useParametros({
    categorias: ['TIPO_COMPROBANTE'],
    fallback: FALLBACK_TIPOS_COMPROBANTE,
  })

  const [showForm, setShowForm] = useState(false)
  const [avanzarTrabajo, setAvanzarTrabajo] = useState<TTrabajo | null>(null)
  const [honorarioInput, setHonorarioInput] = useState('')
  const [tipoComprobanteInput, setTipoComprobanteInput] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const importePreview = calcularImporteFacturado(
    Number(honorarioInput || avanzarTrabajo?.honorario || 0),
    tipoComprobanteInput || avanzarTrabajo?.tipo_comprobante
  )
  const aplicaIva =
    (tipoComprobanteInput || avanzarTrabajo?.tipo_comprobante) === 'FC_A' && importePreview > 0

  const empleadaMap = Object.fromEntries(
    empleadas.map((e) => [e.id, `${e.nombre}${e.apellido ? ' ' + e.apellido : ''}`])
  )

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-none" />
        ))}
      </div>
    )
  if (error) return <p className="text-danger text-sm">{error.message}</p>

  const grouped = (data ?? []).reduce<Record<number, TTrabajo[]>>((acc, t) => {
    ;(acc[t.anio] ??= []).push(t)
    return acc
  }, {})

  const anios = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)

  const necesitaHonorario = (t: TTrabajo) =>
    ESTADO_SIGUIENTE[t.estado] === 'COBRADO' && !t.honorario

  const handleCerrarModal = () => {
    setAvanzarTrabajo(null)
    setHonorarioInput('')
    setTipoComprobanteInput('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Trabajos anuales</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo
        </Button>
      </div>

      {/* Modal nuevo trabajo */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={() => setShowForm(false)}
          />
          <div className="border-border bg-surface relative z-10 w-full max-w-md border p-6 shadow-xl">
            <div className="bg-primary mb-1 h-0.5 w-6" />
            <h2 className="mb-4 text-sm font-bold">Nuevo trabajo</h2>
            <TrabajoForm
              clienteId={clienteId}
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Modal avanzar estado */}
      {avanzarTrabajo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={handleCerrarModal}
          />
          <div className="border-border bg-surface relative z-10 w-full max-w-sm border p-6 shadow-xl">
            <div className="bg-primary mb-1 h-0.5 w-6" />
            <h2 className="mb-1 text-sm font-bold">
              {avanzarTrabajo.tipo_trabajo} — {avanzarTrabajo.anio}
            </h2>
            <p className="text-muted-foreground mb-4 text-xs">
              {ESTADO_LABEL[avanzarTrabajo.estado]} →{' '}
              <strong>{ESTADO_LABEL[ESTADO_SIGUIENTE[avanzarTrabajo.estado]!]}</strong>
            </p>

            {necesitaHonorario(avanzarTrabajo) && (
              <Input
                label="Honorario (sin IVA) *"
                type="number"
                step="0.01"
                min="0.01"
                value={honorarioInput}
                onChange={(e) => setHonorarioInput(e.target.value)}
                className="mb-3"
              />
            )}

            <Select
              id="tipo_comprobante_avanzar"
              label="Comprobante"
              options={tiposComprobante}
              placeholder="Sin comprobante"
              value={tipoComprobanteInput || avanzarTrabajo.tipo_comprobante || ''}
              onChange={(e) => setTipoComprobanteInput(e.target.value)}
              className="mb-3"
            />

            {importePreview > 0 && (
              <div className="border-border bg-muted/20 mb-4 rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total a facturar</span>
                  <span className="text-foreground font-semibold">
                    {formatMoney(importePreview)}
                  </span>
                </div>
                {aplicaIva && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Incluye 21% de IVA (
                    {formatMoney(
                      importePreview - Number(honorarioInput || avanzarTrabajo.honorario || 0)
                    )}
                    )
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={
                  avanzar.isPending || (necesitaHonorario(avanzarTrabajo) && !honorarioInput)
                }
                onClick={async () => {
                  const result = await avanzar.mutateAsync({
                    id: avanzarTrabajo.id,
                    honorario: honorarioInput ? Number(honorarioInput) : undefined,
                    tipo_comprobante:
                      tipoComprobanteInput || avanzarTrabajo.tipo_comprobante || undefined,
                  })
                  if (result.ok) handleCerrarModal()
                }}
              >
                {avanzar.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCerrarModal}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {!data?.length ? (
        <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
          Sin trabajos registrados
        </p>
      ) : (
        <div className="space-y-4">
          {anios.map((anio) => (
            <div key={anio}>
              <p className="text-muted-foreground border-border mb-1.5 border-b pb-1 text-[10px] font-bold tracking-[0.14em] uppercase">
                {anio}
              </p>
              <div className="divide-border border-border divide-y border">
                {grouped[anio].map((t) => {
                  const montoDisplay = t.importe_facturado ?? t.honorario
                  const esFacturaA =
                    t.tipo_comprobante === 'FC_A' &&
                    t.importe_facturado != null &&
                    t.honorario != null &&
                    t.importe_facturado !== t.honorario
                  const responsable = t.asignado_a ? empleadaMap[t.asignado_a] : null
                  return (
                    <div
                      key={t.id}
                      className="bg-surface hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {t.tipo_trabajo.replace(/_/g, ' ')}
                        </span>
                        {montoDisplay != null && (
                          <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                            {formatMoney(montoDisplay)}
                            {esFacturaA && (
                              <span className="text-primary ml-1 text-[10px] font-medium">
                                c/IVA
                              </span>
                            )}
                          </span>
                        )}
                        {t.tipo_comprobante && (
                          <span className="text-muted-foreground ml-2 text-[10px] tracking-wide">
                            {t.tipo_comprobante.replace('_', ' ')}
                          </span>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {responsable && (
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <User className="h-3 w-3" />
                              {responsable}
                            </span>
                          )}
                          {t.fecha_vencimiento && (
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <Calendar className="h-3 w-3" />
                              {formatDate(t.fecha_vencimiento)}
                            </span>
                          )}
                          {t.notas && (
                            <span className="text-muted-foreground truncate text-[11px]">
                              {t.notas}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={ESTADO_VARIANT[t.estado]}>{ESTADO_LABEL[t.estado]}</Badge>
                      <div className="flex shrink-0 items-center gap-1">
                        {t.estado !== 'PENDIENTE' && (
                          <button
                            title="Retroceder estado"
                            onClick={() => retroceder.mutate(t.id)}
                            disabled={retroceder.isPending}
                            className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-40"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {ESTADO_SIGUIENTE[t.estado] && (
                          <button
                            title={`Pasar a ${ESTADO_LABEL[ESTADO_SIGUIENTE[t.estado]!]}`}
                            onClick={() => setAvanzarTrabajo(t)}
                            disabled={avanzar.isPending}
                            className="text-muted-foreground hover:text-primary p-1 disabled:opacity-40"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            title="Eliminar"
                            onClick={() => setDeleteId(t.id)}
                            className="text-muted-foreground hover:text-danger p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar trabajo"
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
