'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useEmpleadas, useCrearEmpleada, useEliminarEmpleada } from '../hooks/useEmpleadas'
import { empleadaSchema, type TEmpleadaForm } from '../schemas/empleadaSchema'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Plus, Trash2, ChevronRight } from 'lucide-react'

const TIPO_COMISION_LABEL: Record<string, string> = {
  PRODUCCION: 'Producción',
  PUNTAJE:    'Puntaje',
  HORAS:      'Por hora',
  NINGUNA:    'Sin comisión',
}

export function EmpleadasPanel() {
  const { data, isLoading } = useEmpleadas()
  const crear   = useCrearEmpleada()
  const eliminar = useEliminarEmpleada()
  const [showForm, setShowForm]   = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  const form = useForm<TEmpleadaForm>({
    resolver: zodResolver(empleadaSchema) as unknown as Resolver<TEmpleadaForm>,
    defaultValues: {
      nombre: '',
      apellido: '',
      tipo_relacion: 'DEPENDENCIA',
      tipo_comision: 'NINGUNA',
      activo: true,
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    const r = await crear.mutateAsync(data)
    if (r.ok) { form.reset(); setShowForm(false) }
  })

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Empleadas</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Agregar
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              {...form.register('nombre')}
              error={form.formState.errors.nombre?.message}
            />
            <Input
              label="Apellido"
              {...form.register('apellido')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">
                Tipo de relación *
              </label>
              <select
                {...form.register('tipo_relacion')}
                className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DEPENDENCIA">Relación de dependencia</option>
                <option value="POR_HORA">Por hora</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">
                Tipo de comisión
              </label>
              <select
                {...form.register('tipo_comision')}
                className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NINGUNA">Sin comisión</option>
                <option value="PRODUCCION">Por producción</option>
                <option value="PUNTAJE">Por puntaje / objetivos</option>
                <option value="HORAS">Por horas trabajadas</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {!data?.length ? (
        <p className="py-6 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin empleadas registradas</p>
      ) : (
        <div className="divide-y divide-border border border-border">
          {data.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">
                  {[e.nombre, e.apellido].filter(Boolean).join(' ')}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {e.tipo_relacion === 'DEPENDENCIA' ? 'Dependencia' : 'Por hora'}
                </span>
                {e.tipo_comision && e.tipo_comision !== 'NINGUNA' && (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {TIPO_COMISION_LABEL[e.tipo_comision]}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${e.activo ? 'text-success' : 'text-muted-foreground'}`}>
                {e.activo ? 'Activa' : 'Inactiva'}
              </span>
              <Link
                href={`/empleadas/${e.id}`}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Ver legajo"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDeleteId(e.id)}
                className="p-1 text-muted-foreground hover:text-danger"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar empleada"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteId) eliminar.mutate(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
