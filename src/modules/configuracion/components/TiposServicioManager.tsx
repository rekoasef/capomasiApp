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
import { toast } from 'sonner'
import { Plus, EyeOff, Eye } from 'lucide-react'

type TipoServicio = {
  id: string
  codigo: string
  descripcion: string
  activo: boolean
  orden: number | null
}

const nuevoTipoSchema = z.object({
  descripcion: z.string().min(2, 'Mínimo 2 caracteres'),
  codigo: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Solo letras mayúsculas, números y _'),
})
type NuevoTipoForm = z.infer<typeof nuevoTipoSchema>

function useTiposServicio() {
  return useQuery({
    queryKey: ['parametros-tipo-servicio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parametros')
        .select('id, codigo, descripcion, activo, orden')
        .eq('categoria', 'TIPO_SERVICIO')
        .order('orden')
        .order('descripcion')
      if (error) throw new Error(error.message)
      return (data ?? []) as TipoServicio[]
    },
  })
}

function useCrearTipoServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (form: NuevoTipoForm) => {
      const { error } = await supabase
        .from('parametros')
        .insert({
          categoria: 'TIPO_SERVICIO',
          codigo: form.codigo,
          descripcion: form.descripcion,
          activo: true,
        })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Tipo de trabajo agregado')
      qc.invalidateQueries({ queryKey: ['parametros-tipo-servicio'] })
      qc.invalidateQueries({ queryKey: ['parametros'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useToggleTipoServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('parametros').update({ activo }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.activo ? 'Tipo activado' : 'Tipo desactivado')
      qc.invalidateQueries({ queryKey: ['parametros-tipo-servicio'] })
      qc.invalidateQueries({ queryKey: ['parametros'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function TiposServicioManager() {
  const { isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const { data = [], isLoading } = useTiposServicio()
  const crear = useCrearTipoServicio()
  const toggle = useToggleTipoServicio()

  const form = useForm<NuevoTipoForm>({
    resolver: zodResolver(nuevoTipoSchema),
    defaultValues: { descripcion: '', codigo: '' },
  })

  // Auto-generar código a partir de la descripción
  const handleDescripcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('descripcion', e.target.value)
    const auto = e.target.value
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
    form.setValue('codigo', auto, { shouldValidate: false })
  }

  const onSubmit = form.handleSubmit(async (data) => {
    await crear.mutateAsync(data)
    form.reset({ descripcion: '', codigo: '' })
    setShowForm(false)
  })

  if (!isAdmin) return null

  const activos = data.filter((t) => t.activo)
  const inactivos = data.filter((t) => !t.activo)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Tipos de trabajo</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Lista maestra de trabajos realizados en el estudio
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="border-border bg-surface space-y-3 border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nombre del trabajo *"
              placeholder="Ej: Ganancias Persona Jurídica"
              {...form.register('descripcion')}
              onChange={handleDescripcionChange}
              error={form.formState.errors.descripcion?.message}
            />
            <div>
              <Input
                label="Código interno *"
                placeholder="Auto-generado"
                {...form.register('codigo')}
                error={form.formState.errors.codigo?.message}
              />
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                Solo mayúsculas, números y guión bajo
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset()
                setShowForm(false)
              }}
            >
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
      ) : (
        <div className="border-border divide-border divide-y border">
          {activos.map((t) => (
            <div
              key={t.id}
              className="bg-surface hover:bg-muted/20 flex items-center justify-between px-4 py-2.5"
            >
              <div>
                <span className="text-sm font-medium">{t.descripcion}</span>
                <span className="text-muted-foreground ml-2 font-mono text-[10px]">{t.codigo}</span>
              </div>
              <button
                type="button"
                title="Desactivar"
                onClick={() => toggle.mutate({ id: t.id, activo: false })}
                className="text-muted-foreground hover:text-danger p-1 transition-colors"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {inactivos.length > 0 && (
            <>
              <div className="bg-muted/10 px-4 py-2">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Desactivados
                </span>
              </div>
              {inactivos.map((t) => (
                <div
                  key={t.id}
                  className="bg-surface hover:bg-muted/20 flex items-center justify-between px-4 py-2.5 opacity-50 transition-opacity hover:opacity-100"
                >
                  <div>
                    <span className="text-sm">{t.descripcion}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-[10px]">
                      {t.codigo}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Activar"
                    onClick={() => toggle.mutate({ id: t.id, activo: true })}
                    className="text-muted-foreground hover:text-success p-1 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
