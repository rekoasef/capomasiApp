'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { trabajoSchema, type TTrabajoForm } from '../schemas/trabajoSchema'
import { useCrearTrabajo } from '../hooks/useTrabajos'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_SERVICIO } from '@/shared/lib/parametros'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const ANIOS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

export function TrabajoForm({ clienteId, onSuccess, onCancel }: Props) {
  const crear = useCrearTrabajo(clienteId)
  const { data: tiposTrabajo = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_TRABAJO', 'TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })
  const { data: empleadas = [] } = useEmpleadas()
  const [selectedEmpleadas, setSelectedEmpleadas] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TTrabajoForm>({
    resolver: zodResolver(trabajoSchema) as Resolver<TTrabajoForm>,
    defaultValues: {
      cliente_id: clienteId,
      anio: new Date().getFullYear(),
    },
  })

  const toggleEmpleada = (id: string) => {
    setSelectedEmpleadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function onSubmit(data: TTrabajoForm) {
    const result = await crear.mutateAsync({ ...data, empleada_ids: selectedEmpleadas })
    if (result.ok) {
      reset()
      setSelectedEmpleadas([])
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_trabajo"
          label="Tipo de trabajo *"
          options={tiposTrabajo}
          placeholder="Seleccionar"
          error={errors.tipo_trabajo?.message}
          disabled={crear.isPending}
          {...register('tipo_trabajo')}
        />
        <Select
          id="anio"
          label="Año *"
          options={ANIOS}
          error={errors.anio?.message}
          disabled={crear.isPending}
          {...register('anio')}
        />
      </div>

      <Input
        id="honorario"
        label="Honorario (opcional)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Se puede cargar después"
        error={errors.honorario?.message}
        disabled={crear.isPending}
        {...register('honorario')}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">Empleadas asignadas</p>
        {empleadas.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin empleadas registradas en el sistema</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {empleadas.map((e) => {
              const selected = selectedEmpleadas.includes(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={crear.isPending}
                  onClick={() => toggleEmpleada(e.id)}
                  className={`px-3 py-1 text-xs font-medium border transition-colors disabled:opacity-50 ${
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
        )}
      </div>

      <Textarea
        id="notas"
        label="Notas"
        disabled={crear.isPending}
        {...register('notas')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={crear.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
