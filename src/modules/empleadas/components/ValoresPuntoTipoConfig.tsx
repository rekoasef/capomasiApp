'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  useValoresPuntoTipo,
  useUpsertValoresPuntoTipo,
  useDeleteValoresPuntoTipo,
} from '../hooks/useEmpleadas'
import {
  valoresPuntoTipoSchema,
  type TValoresPuntoTipoForm,
} from '../schemas/empleadaSchema'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Plus, Trash2 } from 'lucide-react'

export function ValoresPuntoTipoConfig() {
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: valores = [], isLoading } = useValoresPuntoTipo()
  const upsert = useUpsertValoresPuntoTipo()
  const eliminar = useDeleteValoresPuntoTipo()

  const { data: tiposTrabajo = [] } = useParametros({ categorias: ['TIPO_SERVICIO'] })

  const form = useForm<TValoresPuntoTipoForm>({
    resolver: zodResolver(valoresPuntoTipoSchema) as unknown as Resolver<TValoresPuntoTipoForm>,
    defaultValues: { tipo_trabajo: '', valor_por_punto: 0, vigente_desde: toLocalDateInputValue() },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const r = await upsert.mutateAsync(data)
    if (r.ok) {
      form.reset({ tipo_trabajo: '', valor_por_punto: 0, vigente_desde: toLocalDateInputValue() })
      setShowForm(false)
    }
  })

  const valoresVigentes = valores.filter(
    (v, i, arr) => arr.findIndex((x) => x.tipo_trabajo === v.tipo_trabajo) === i,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Valor del punto por tipo de trabajo</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cuánto vale cada punto según el tipo de trabajo. Se aplica a todas las empleadas.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar / Actualizar
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="border border-border bg-surface p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              label="Valor por punto ($) *"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('valor_por_punto')}
              error={form.formState.errors.valor_por_punto?.message}
            />
            <Input
              label="Vigente desde *"
              type="date"
              {...form.register('vigente_desde')}
              error={form.formState.errors.vigente_desde?.message}
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
      ) : !valoresVigentes.length ? (
        <p className="py-6 text-center text-xs tracking-widest uppercase text-muted-foreground">
          Sin valores configurados. El sistema no puede calcular comisiones por puntaje.
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
                  Valor por punto
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                  Vigente desde
                </th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {valoresVigentes.map((v) => (
                <tr key={v.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{v.tipo_trabajo}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                    {formatMoney(Number(v.valor_por_punto))}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(v.vigente_desde)}</td>
                  <td className="w-10 px-4 py-2.5">
                    <button
                      onClick={() => setDeleteId(v.id)}
                      className="p-1 text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar valor"
        description="Se eliminará este valor de punto."
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
