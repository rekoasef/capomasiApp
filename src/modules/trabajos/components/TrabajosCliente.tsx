'use client'

import { useState } from 'react'
import { useTrabajosCliente, useAvanzarEstado, useRetrocederEstado, useEliminarTrabajo } from '../hooks/useTrabajos'
import { TrabajoForm } from './TrabajoForm'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Input } from '@/shared/components/ui/input'
import { formatMoney } from '@/shared/utils/formatters'
import { useAuth } from '@/lib/auth/useAuth'
import { Plus, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react'
import { ESTADO_LABEL, ESTADO_SIGUIENTE, type TTrabajo } from '../types'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE:  'outline',
  EN_PROCESO: 'secondary',
  FINALIZADO: 'default',
  COBRADO:    'default',
}

type Props = { clienteId: string }

export function TrabajosCliente({ clienteId }: Props) {
  const { data, isLoading, error } = useTrabajosCliente(clienteId)
  const avanzar = useAvanzarEstado(clienteId)
  const retroceder = useRetrocederEstado()
  const eliminar = useEliminarTrabajo()
  const { isAdmin } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [avanzarTrabajo, setAvanzarTrabajo] = useState<TTrabajo | null>(null)
  const [honorarioInput, setHonorarioInput] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
  if (error) return <p className="text-sm text-danger">{error.message}</p>

  const grouped = (data ?? []).reduce<Record<number, TTrabajo[]>>((acc, t) => {
    ;(acc[t.anio] ??= []).push(t)
    return acc
  }, {})

  const anios = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  const necesitaHonorario = (t: TTrabajo) =>
    ESTADO_SIGUIENTE[t.estado] === 'COBRADO' && !t.honorario

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Trabajos anuales</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-md border border-border bg-surface p-6 shadow-xl">
            <div className="mb-1 h-0.5 w-6 bg-primary" />
            <h2 className="mb-4 text-sm font-bold">Nuevo trabajo</h2>
            <TrabajoForm clienteId={clienteId} onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Modal avanzar estado */}
      {avanzarTrabajo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={() => setAvanzarTrabajo(null)} />
          <div className="relative z-10 w-full max-w-sm border border-border bg-surface p-6 shadow-xl">
            <div className="mb-1 h-0.5 w-6 bg-primary" />
            <h2 className="mb-1 text-sm font-bold">
              {avanzarTrabajo.tipo_trabajo} — {avanzarTrabajo.anio}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {ESTADO_LABEL[avanzarTrabajo.estado]} → <strong>{ESTADO_LABEL[ESTADO_SIGUIENTE[avanzarTrabajo.estado]!]}</strong>
            </p>
            {necesitaHonorario(avanzarTrabajo) && (
              <Input
                label="Honorario (requerido para cobrar) *"
                type="number"
                step="0.01"
                min="0.01"
                value={honorarioInput}
                onChange={(e) => setHonorarioInput(e.target.value)}
                className="mb-4"
              />
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={avanzar.isPending || (necesitaHonorario(avanzarTrabajo) && !honorarioInput)}
                onClick={async () => {
                  const result = await avanzar.mutateAsync({
                    id: avanzarTrabajo.id,
                    honorario: honorarioInput ? Number(honorarioInput) : undefined,
                  })
                  if (result.ok) { setAvanzarTrabajo(null); setHonorarioInput('') }
                }}
              >
                {avanzar.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAvanzarTrabajo(null); setHonorarioInput('') }}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {!data?.length ? (
        <p className="py-6 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin trabajos registrados</p>
      ) : (
        <div className="space-y-4">
          {anios.map((anio) => (
            <div key={anio}>
              <p className="mb-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground border-b border-border pb-1">{anio}</p>
              <div className="divide-y divide-border border border-border">
                {grouped[anio].map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{t.tipo_trabajo.replace(/_/g, ' ')}</span>
                      {t.honorario && (
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">{formatMoney(t.honorario)}</span>
                      )}
                      {t.notas && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.notas}</p>}
                    </div>
                    <Badge variant={ESTADO_VARIANT[t.estado]}>{ESTADO_LABEL[t.estado]}</Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.estado !== 'PENDIENTE' && (
                        <button
                          title="Retroceder estado"
                          onClick={() => retroceder.mutate(t.id)}
                          disabled={retroceder.isPending}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {ESTADO_SIGUIENTE[t.estado] && (
                        <button
                          title={`Pasar a ${ESTADO_LABEL[ESTADO_SIGUIENTE[t.estado]!]}`}
                          onClick={() => setAvanzarTrabajo(t)}
                          disabled={avanzar.isPending}
                          className="p-1 text-muted-foreground hover:text-primary disabled:opacity-40"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          title="Eliminar"
                          onClick={() => setDeleteId(t.id)}
                          className="p-1 text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
        onConfirm={() => { if (deleteId) eliminar.mutate(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
