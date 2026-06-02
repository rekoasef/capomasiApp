'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate } from '@/shared/utils/formatters'
import { gastoRecurrenteSchema, type TGastoRecurrenteForm } from '../schemas/gastoRecurrenteSchema'
import { useCategoriasGastos } from '../hooks/useCategoriasGastos'
import { useActualizarGastoRecurrente, useCrearGastoRecurrente, useGastosRecurrentes } from '../hooks/useGastosRecurrentes'
import type { TGastoRecurrente } from '../types'
import { Edit2, Power } from 'lucide-react'

export function GastosRecurrentesPanel() {
  const { data: categorias = [] } = useCategoriasGastos()
  const { data: gastos, isLoading, error } = useGastosRecurrentes({ includeInactive: true })
  const crear = useCrearGastoRecurrente()
  const actualizar = useActualizarGastoRecurrente()
  const [editing, setEditing] = useState<TGastoRecurrente | null>(null)

  const form = useForm<TGastoRecurrenteForm>({
    resolver: zodResolver(gastoRecurrenteSchema) as Resolver<TGastoRecurrenteForm>,
    defaultValues: { categoria_id: '', descripcion: '', dia_vencimiento: 10, activo: true, notas: null },
  })

  const startEdit = (gasto: TGastoRecurrente) => {
    setEditing(gasto)
    form.reset({
      categoria_id: gasto.categoria_id,
      descripcion: gasto.descripcion,
      dia_vencimiento: gasto.dia_vencimiento,
      activo: gasto.activo,
      notas: gasto.notas,
    })
  }

  const stopEdit = () => {
    setEditing(null)
    form.reset({ categoria_id: '', descripcion: '', dia_vencimiento: 10, activo: true, notas: null })
  }

  const handleSubmit = form.handleSubmit((data) => {
    if (editing) {
      actualizar.mutate({ id: editing.id, form: data }, { onSuccess: (r) => { if (r.ok) stopEdit() } })
      return
    }
    crear.mutate(data, { onSuccess: (r) => { if (r.ok) stopEdit() } })
  })

  if (isLoading) return <Skeleton className="h-56 w-full rounded-none" />
  if (error) return <p className="text-sm text-danger">{error.message}</p>

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="overflow-x-auto border border-border">
        {!gastos?.length ? (
          <p className="py-10 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin gastos recurrentes</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Gasto</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Categoría</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Próximo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {gastos.map((gasto) => (
                <tr key={gasto.id} className="hover:bg-muted/25">
                  <td className="px-4 py-3 font-semibold">{gasto.descripcion}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="mr-2 inline-block h-2 w-2" style={{ backgroundColor: gasto.categorias_gastos?.color ?? 'var(--muted-foreground)' }} />
                    {gasto.categorias_gastos?.nombre ?? 'Sin categoría'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(gasto.proxima_fecha_vencimiento)} · día {gasto.dia_vencimiento}</td>
                  <td className="px-4 py-3">
                    <Badge variant={gasto.activo ? 'default' : 'outline'}>{gasto.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => startEdit(gasto)} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => actualizar.mutate({ id: gasto.id, form: { activo: !gasto.activo } })}
                        className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title={gasto.activo ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-bold">{editing ? 'Editar recurrente' : 'Nuevo recurrente'}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Categoría *</label>
            <select
              {...form.register('categoria_id')}
              className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
              ))}
            </select>
            {form.formState.errors.categoria_id && <p className="mt-1 text-[11px] text-danger">{form.formState.errors.categoria_id.message}</p>}
          </div>
          <Input label="Descripción *" {...form.register('descripcion')} error={form.formState.errors.descripcion?.message} />
          <Input
            label="Día de vencimiento *"
            type="number"
            min="1"
            max="31"
            {...form.register('dia_vencimiento', { valueAsNumber: true })}
            error={form.formState.errors.dia_vencimiento?.message}
          />
          <Input label="Notas" {...form.register('notas')} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" {...form.register('activo')} className="accent-primary" />
            Activo
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending || actualizar.isPending}>
              {editing ? 'Actualizar' : 'Guardar'}
            </Button>
            {editing && <Button type="button" size="sm" variant="outline" onClick={stopEdit}>Cancelar</Button>}
          </div>
        </div>
      </form>
    </div>
  )
}
