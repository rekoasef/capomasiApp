'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { categoriaGastoSchema, type TCategoriaGastoForm } from '../schemas/categoriaGastoSchema'
import { useActualizarCategoriaGasto, useCategoriasGastos, useCrearCategoriaGasto, useEliminarCategoriaGasto } from '../hooks/useCategoriasGastos'
import type { TCategoriaGasto } from '../types'
import { Edit2, Power, Trash2 } from 'lucide-react'

export function CategoriasManager() {
  const { data: categorias, isLoading, error } = useCategoriasGastos({ includeInactive: true })
  const crear = useCrearCategoriaGasto()
  const actualizar = useActualizarCategoriaGasto()
  const eliminar = useEliminarCategoriaGasto()
  const [editing, setEditing] = useState<TCategoriaGasto | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<TCategoriaGastoForm>({
    resolver: zodResolver(categoriaGastoSchema) as Resolver<TCategoriaGastoForm>,
    defaultValues: { nombre: '', color: '#64748b', activo: true },
  })

  const startEdit = (categoria: TCategoriaGasto) => {
    setEditing(categoria)
    form.reset({ nombre: categoria.nombre, color: categoria.color ?? '#64748b', activo: categoria.activo })
  }

  const stopEdit = () => {
    setEditing(null)
    form.reset({ nombre: '', color: '#64748b', activo: true })
  }

  const handleSubmit = form.handleSubmit((data) => {
    if (editing) {
      actualizar.mutate({ id: editing.id, form: data }, { onSuccess: (r) => { if (r.ok) stopEdit() } })
      return
    }
    crear.mutate(data, { onSuccess: (r) => { if (r.ok) stopEdit() } })
  })

  if (isLoading) return <Skeleton className="h-48 w-full rounded-none" />
  if (error) return <p className="text-sm text-danger">{error.message}</p>

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="divide-y divide-border border border-border">
        {!categorias?.length ? (
          <p className="py-10 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin categorías</p>
        ) : (
          categorias.map((categoria) => (
            <div key={categoria.id} className="flex items-center gap-3 bg-surface px-4 py-3 hover:bg-muted/25">
              <span className="h-4 w-4 border border-border" style={{ backgroundColor: categoria.color ?? 'transparent' }} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${!categoria.activo ? 'text-muted-foreground line-through' : ''}`}>{categoria.nombre}</p>
                <p className="text-xs text-muted-foreground">{categoria.activo ? 'Activa' : 'Inactiva'}</p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(categoria)}
                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Editar"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => actualizar.mutate({ id: categoria.id, form: { activo: !categoria.activo } })}
                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title={categoria.activo ? 'Desactivar' : 'Activar'}
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(categoria.id)}
                className="p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-bold">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <div className="space-y-3">
          <Input label="Nombre *" {...form.register('nombre')} error={form.formState.errors.nombre?.message} />
          <div>
            <label className="mb-1 block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Color</label>
            <input
              type="color"
              {...form.register('color')}
              className="h-9 w-full border border-border bg-surface p-1"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" {...form.register('activo')} className="accent-primary" />
            Activa
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending || actualizar.isPending}>
              {editing ? 'Actualizar' : 'Guardar'}
            </Button>
            {editing && <Button type="button" size="sm" variant="outline" onClick={stopEdit}>Cancelar</Button>}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar categoría"
        description="Solo se elimina si no tiene gastos asociados."
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteId) eliminar.mutate(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
