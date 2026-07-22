'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { categoriaGastoSchema, type TCategoriaGastoForm } from '../schemas/categoriaGastoSchema'
import {
  useActualizarCategoriaGasto,
  useCategoriasGastos,
  useCrearCategoriaGasto,
  useEliminarCategoriaGasto,
} from '../hooks/useCategoriasGastos'
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
    defaultValues: { nombre: '', color: '#64748b', activo: true, ambito: 'PERSONAL' },
  })

  const startEdit = (categoria: TCategoriaGasto) => {
    setEditing(categoria)
    form.reset({
      nombre: categoria.nombre,
      color: categoria.color ?? '#64748b',
      activo: categoria.activo,
      ambito: categoria.ambito,
    })
  }

  const stopEdit = () => {
    setEditing(null)
    form.reset({ nombre: '', color: '#64748b', activo: true, ambito: 'PERSONAL' })
  }

  const handleSubmit = form.handleSubmit((data) => {
    if (editing) {
      actualizar.mutate(
        { id: editing.id, form: data },
        {
          onSuccess: (r) => {
            if (r.ok) stopEdit()
          },
        }
      )
      return
    }
    crear.mutate(data, {
      onSuccess: (r) => {
        if (r.ok) stopEdit()
      },
    })
  })

  if (isLoading) return <Skeleton className="h-48 w-full rounded-none" />
  if (error) return <p className="text-danger text-sm">{error.message}</p>

  const personales = categorias?.filter((c) => c.ambito === 'PERSONAL') ?? []
  const estudio = categorias?.filter((c) => c.ambito === 'ESTUDIO') ?? []

  const renderCategoria = (categoria: TCategoriaGasto) => (
    <div
      key={categoria.id}
      className="bg-surface hover:bg-muted/25 flex items-center gap-3 px-4 py-3"
    >
      <span
        className="border-border h-4 w-4 border"
        style={{ backgroundColor: categoria.color ?? 'transparent' }}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${!categoria.activo ? 'text-muted-foreground line-through' : ''}`}
        >
          {categoria.nombre}
        </p>
        <p className="text-muted-foreground text-xs">{categoria.activo ? 'Activa' : 'Inactiva'}</p>
      </div>
      <button
        type="button"
        onClick={() => startEdit(categoria)}
        className="text-muted-foreground hover:bg-muted hover:text-foreground p-1.5"
        title="Editar"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => actualizar.mutate({ id: categoria.id, form: { activo: !categoria.activo } })}
        className="text-muted-foreground hover:bg-muted hover:text-foreground p-1.5"
        title={categoria.activo ? 'Desactivar' : 'Activar'}
      >
        <Power className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setDeleteId(categoria.id)}
        className="text-muted-foreground hover:bg-danger/10 hover:text-danger p-1.5"
        title="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        {!categorias?.length ? (
          <p className="text-muted-foreground border-border border py-10 text-center text-xs tracking-widest uppercase">
            Sin categorías
          </p>
        ) : (
          <>
            <section>
              <h2 className="text-muted-foreground mb-2 text-[11px] font-bold tracking-[0.16em] uppercase">
                Gastos personales
              </h2>
              {personales.length ? (
                <div className="divide-border border-border divide-y border">
                  {personales.map(renderCategoria)}
                </div>
              ) : (
                <p className="text-muted-foreground border-border border px-4 py-3 text-xs">
                  Sin categorías personales
                </p>
              )}
            </section>
            <section>
              <h2 className="text-muted-foreground mb-2 text-[11px] font-bold tracking-[0.16em] uppercase">
                Gastos del estudio
              </h2>
              {estudio.length ? (
                <div className="divide-border border-border divide-y border">
                  {estudio.map(renderCategoria)}
                </div>
              ) : (
                <p className="text-muted-foreground border-border border px-4 py-3 text-xs">
                  Sin categorías del estudio
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-border bg-surface border p-4">
        <h2 className="mb-3 text-sm font-bold">
          {editing ? 'Editar categoría' : 'Nueva categoría'}
        </h2>
        <div className="space-y-3">
          <Input
            label="Nombre *"
            {...form.register('nombre')}
            error={form.formState.errors.nombre?.message}
          />
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Ámbito
            </label>
            <select
              {...form.register('ambito')}
              className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              <option value="PERSONAL">Gasto personal</option>
              <option value="ESTUDIO">Gasto del estudio</option>
            </select>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Los gastos del estudio se descuentan del resultado en el Dashboard.
            </p>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Color
            </label>
            <input
              type="color"
              {...form.register('color')}
              className="border-border bg-surface h-9 w-full border p-1"
            />
          </div>
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            <input type="checkbox" {...form.register('activo')} className="accent-primary" />
            Activa
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending || actualizar.isPending}>
              {editing ? 'Actualizar' : 'Guardar'}
            </Button>
            {editing && (
              <Button type="button" size="sm" variant="outline" onClick={stopEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar categoría"
        description="Solo se elimina si no tiene gastos asociados."
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
