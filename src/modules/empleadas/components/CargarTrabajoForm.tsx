'use client'

import { useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/useAuth'
import { clientesService } from '@/modules/clientes/services/clientesService'
import { useEmpleadas, useCargarTrabajo } from '../hooks/useEmpleadas'
import {
  trabajoRealizadoSchema,
  type TTrabajoRealizadoForm,
} from '../schemas/trabajoRealizadoSchema'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_SERVICIO } from '@/shared/lib/parametros'

type Props = {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CargarTrabajoForm({ onSuccess, onCancel }: Props) {
  const { user, isAdmin } = useAuth()
  const crear = useCargarTrabajo()
  const { data: empleadas = [] } = useEmpleadas()
  const { data: tiposTrabajo = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', 'lite'],
    queryFn: async () => {
      const r = await clientesService.getAll()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })

  const empleadaPropia = useMemo(
    () => empleadas.find((empleada) => empleada.usuario_id === user?.id),
    [empleadas, user?.id]
  )

  const [selectedEmpleadaIds, setSelectedEmpleadaIds] = useState<string[]>([])
  const [empleadasError, setEmpleadasError] = useState<string | null>(null)

  // Para no-admin la selección está fija a la propia empleada (no hay toggle en la UI)
  const empleadaIds = isAdmin ? selectedEmpleadaIds : empleadaPropia ? [empleadaPropia.id] : []

  const toggleEmpleada = (id: string) => {
    setEmpleadasError(null)
    setSelectedEmpleadaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TTrabajoRealizadoForm>({
    resolver: zodResolver(trabajoRealizadoSchema) as unknown as Resolver<TTrabajoRealizadoForm>,
    defaultValues: {
      fecha: toLocalDateInputValue(),
      cliente_id: '',
      tipo_trabajo: '',
      descripcion: '',
    },
  })

  const clientesOptions = clientes.map((cliente) => ({
    value: cliente.id,
    label: cliente.nombre,
  }))

  async function onSubmit(data: TTrabajoRealizadoForm) {
    if (empleadaIds.length === 0) {
      setEmpleadasError('Seleccioná al menos una empleada')
      return
    }
    const payload = {
      ...data,
      empleada_ids: empleadaIds,
      cliente_id: data.cliente_id || null,
    }
    const r = await crear.mutateAsync(payload)
    if (r.ok) {
      reset({
        fecha: toLocalDateInputValue(),
        cliente_id: '',
        tipo_trabajo: '',
        descripcion: '',
      })
      if (isAdmin) setSelectedEmpleadaIds([])
      onSuccess?.()
    }
  }

  if (!isAdmin && !empleadaPropia) {
    return (
      <div className="border-danger/30 bg-danger/5 text-danger rounded-md border p-4 text-sm">
        No hay una empleada vinculada a tu usuario. Un admin tiene que asociarla antes de que puedas
        cargar trabajos.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isAdmin && (
        <div>
          <p className="text-foreground mb-1.5 text-xs font-medium">Empleadas *</p>
          <div className="flex flex-wrap gap-2">
            {empleadas.map((e) => {
              const selected = selectedEmpleadaIds.includes(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={crear.isPending}
                  onClick={() => toggleEmpleada(e.id)}
                  className={`border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {e.nombre}
                </button>
              )
            })}
          </div>
          {empleadasError && <p className="text-danger mt-1 text-xs">{empleadasError}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id="fecha"
          label="Fecha *"
          type="date"
          error={errors.fecha?.message}
          disabled={crear.isPending}
          {...register('fecha')}
        />
        <Select
          id="tipo_trabajo"
          label="Tipo de trabajo *"
          options={tiposTrabajo}
          placeholder="Seleccionar tipo"
          error={errors.tipo_trabajo?.message}
          disabled={crear.isPending}
          {...register('tipo_trabajo')}
        />
      </div>

      <Select
        id="cliente_id"
        label="Cliente"
        options={clientesOptions}
        placeholder="Sin cliente asociado"
        error={errors.cliente_id?.message}
        disabled={crear.isPending}
        {...register('cliente_id')}
      />

      <Textarea
        id="descripcion"
        label="Descripción *"
        rows={4}
        error={errors.descripcion?.message}
        disabled={crear.isPending}
        {...register('descripcion')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar trabajo'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={crear.isPending}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
