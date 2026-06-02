'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  usePuntosTrabajoConfig,
  useUpsertPuntosTrabajoConfig,
  useDeletePuntosTrabajoConfig,
} from '@/modules/empleadas/hooks/useEmpleadas'
import {
  puntosTrabajoConfigSchema,
  type TPuntosTrabajoConfigForm,
} from '@/modules/empleadas/schemas/empleadaSchema'
import { useAuth } from '@/lib/auth/useAuth'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  clienteId: string
}

export function PuntosClienteSection({ clienteId }: Props) {
  const { isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: config = [], isLoading } = usePuntosTrabajoConfig(clienteId)
  const upsert = useUpsertPuntosTrabajoConfig()
  const eliminar = useDeletePuntosTrabajoConfig()

  const { data: tiposTrabajo = [] } = useParametros({ categorias: ['TIPO_SERVICIO'] })

  const form = useForm<TPuntosTrabajoConfigForm>({
    resolver: zodResolver(puntosTrabajoConfigSchema) as unknown as Resolver<TPuntosTrabajoConfigForm>,
    defaultValues: { cliente_id: clienteId, tipo_trabajo: '', puntos: 0, activo: true },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const r = await upsert.mutateAsync({ ...data, cliente_id: clienteId })
    if (r.ok) {
      form.reset({ cliente_id: clienteId, tipo_trabajo: '', puntos: 0, activo: true })
      setShowForm(false)
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Puntajes</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Puntos asignados a cada tipo de trabajo de este cliente
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar
          </Button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={onSubmit} className="border border-border bg-surface p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">
                Tipo de trabajo *
              </label>
              <select
                {...form.register('tipo_trabajo')}
                className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Seleccionar...</option>
                {tiposTrabajo.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.tipo_trabajo && (
                <p className="mt-1 text-xs text-danger">
                  {form.formState.errors.tipo_trabajo.message}
                </p>
              )}
            </div>
            <Input
              label="Puntos *"
              type="number"
              step="0.5"
              min="0.5"
              {...form.register('puntos')}
              error={form.formState.errors.puntos?.message}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : !config.length ? (
        <p className="py-6 text-center text-xs tracking-widest uppercase text-muted-foreground">
          Sin puntajes configurados para este cliente
        </p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                  Tipo de trabajo
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                  Puntos
                </th>
                {isAdmin && <th className="w-10 px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {config.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{c.tipo_trabajo}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                    {Number(c.puntos).toFixed(2)}
                  </td>
                  {isAdmin && (
                    <td className="w-10 px-4 py-2.5">
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="p-1 text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar puntaje"
        description="Se eliminará esta configuración de puntos para este cliente."
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
