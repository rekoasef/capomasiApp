'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/useAuth'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CollapsibleSection } from '@/shared/components/CollapsibleSection'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, EyeOff, Eye } from 'lucide-react'

export type ParametroRow = {
  id: string
  codigo: string
  descripcion: string
  activo: boolean
  orden: number | null
}

type Props = {
  categoria: string
  queryKey: string
  title: string
  description: string
  nombreLabel: string
  nombrePlaceholder: string
  /** Cuántos registros usan este código. Si es > 0 se bloquea el borrado. */
  contarUsos: (codigo: string) => Promise<number>
}

const schema = z.object({
  descripcion: z.string().min(2, 'Mínimo 2 caracteres'),
  codigo: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Solo letras mayúsculas, números y _'),
})
type FormValues = z.infer<typeof schema>

export function ParametroCrudManager({
  categoria,
  queryKey,
  title,
  description,
  nombreLabel,
  nombrePlaceholder,
  contarUsos,
}: Props) {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ParametroRow | null>(null)
  const [toDelete, setToDelete] = useState<ParametroRow | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parametros')
        .select('id, codigo, descripcion, activo, orden')
        .eq('categoria', categoria)
        .order('orden')
        .order('descripcion')
      if (error) throw new Error(error.message)
      return (data ?? []) as ParametroRow[]
    },
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: [queryKey] })
    qc.invalidateQueries({ queryKey: ['parametros'] })
  }

  const crear = useMutation({
    mutationFn: async (values: FormValues) => {
      const orden = data.reduce((m, t) => Math.max(m, t.orden ?? 0), 0) + 1
      const { error } = await supabase.from('parametros').insert({
        categoria,
        codigo: values.codigo,
        descripcion: values.descripcion,
        activo: true,
        orden,
      })
      if (error) {
        if (error.code === '23505') throw new Error('Ya existe un tipo con ese código')
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      toast.success('Tipo agregado')
      invalidar()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const actualizar = useMutation({
    mutationFn: async ({ id, descripcion }: { id: string; descripcion: string }) => {
      const { error } = await supabase.from('parametros').update({ descripcion }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Tipo actualizado')
      invalidar()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('parametros').update({ activo }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.activo ? 'Tipo activado' : 'Tipo desactivado')
      invalidar()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const eliminar = useMutation({
    mutationFn: async (row: ParametroRow) => {
      const usos = await contarUsos(row.codigo)
      if (usos > 0) {
        throw new Error(
          `No se puede eliminar: hay ${usos} registro(s) que usan este tipo. Desactivalo en su lugar.`
        )
      }
      const { error } = await supabase.from('parametros').delete().eq('id', row.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Tipo eliminado')
      invalidar()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { descripcion: '', codigo: '' },
  })

  const handleDescripcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('descripcion', e.target.value)
    if (editing) return // en edición el código queda fijo
    const auto = e.target.value
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
    form.setValue('codigo', auto, { shouldValidate: false })
  }

  const abrirNuevo = () => {
    setEditing(null)
    form.reset({ descripcion: '', codigo: '' })
    setShowForm(true)
  }

  const abrirEdicion = (row: ParametroRow) => {
    setEditing(row)
    form.reset({ descripcion: row.descripcion, codigo: row.codigo })
    setShowForm(true)
  }

  const cerrarForm = () => {
    setShowForm(false)
    setEditing(null)
    form.reset({ descripcion: '', codigo: '' })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (editing) {
      await actualizar.mutateAsync({ id: editing.id, descripcion: values.descripcion })
    } else {
      await crear.mutateAsync(values)
    }
    cerrarForm()
  })

  if (!isAdmin) return null

  const activos = data.filter((t) => t.activo)
  const inactivos = data.filter((t) => !t.activo)
  const guardando = crear.isPending || actualizar.isPending

  const renderFila = (row: ParametroRow, dim = false) => (
    <div
      key={row.id}
      className={`bg-surface hover:bg-muted/20 flex items-center justify-between px-4 py-2.5 ${
        dim ? 'opacity-50 transition-opacity hover:opacity-100' : ''
      }`}
    >
      <div>
        <span className={`text-sm ${dim ? '' : 'font-medium'}`}>{row.descripcion}</span>
        <span className="text-muted-foreground ml-2 font-mono text-[10px]">{row.codigo}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Editar"
          onClick={() => abrirEdicion(row)}
          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={row.activo ? 'Desactivar' : 'Activar'}
          onClick={() => toggle.mutate({ id: row.id, activo: !row.activo })}
          className={`text-muted-foreground p-1 transition-colors ${
            row.activo ? 'hover:text-danger' : 'hover:text-success'
          }`}
        >
          {row.activo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          title="Eliminar"
          onClick={() => setToDelete(row)}
          className="text-muted-foreground hover:text-danger p-1 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )

  return (
    <CollapsibleSection title={title} description={description}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={showForm ? cerrarForm : abrirNuevo}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="border-border bg-surface space-y-3 border p-4">
            <p className="text-sm font-semibold">{editing ? 'Editar tipo' : 'Nuevo tipo'}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label={`${nombreLabel} *`}
                placeholder={nombrePlaceholder}
                {...form.register('descripcion')}
                onChange={handleDescripcionChange}
                error={form.formState.errors.descripcion?.message}
              />
              <div>
                <Input
                  label="Código interno *"
                  placeholder="Auto-generado"
                  disabled={!!editing}
                  {...form.register('codigo')}
                  error={form.formState.errors.codigo?.message}
                />
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  {editing
                    ? 'El código no se puede cambiar (otros registros lo usan como referencia)'
                    : 'Solo mayúsculas, números y guión bajo'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={guardando}>
                {guardando ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cerrarForm}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-none" />
            ))}
          </div>
        ) : !data.length ? (
          <p className="text-muted-foreground border-border border px-4 py-6 text-center text-sm">
            Todavía no hay tipos cargados.
          </p>
        ) : (
          <div className="border-border divide-border divide-y border">
            {activos.map((t) => renderFila(t))}
            {inactivos.length > 0 && (
              <>
                <div className="bg-muted/10 px-4 py-2">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                    Desactivados
                  </span>
                </div>
                {inactivos.map((t) => renderFila(t, true))}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar tipo"
        description={
          toDelete
            ? `¿Eliminás "${toDelete.descripcion}"? Si está en uso en algún registro no se podrá borrar (usá "Desactivar").`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (toDelete) await eliminar.mutateAsync(toDelete)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
        isPending={eliminar.isPending}
      />
    </CollapsibleSection>
  )
}
