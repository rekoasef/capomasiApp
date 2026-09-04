'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editarHonorarioSchema, type TEditarHonorarioForm } from '../schemas/honorarioSchema'
import { useEditarHonorarioManual } from '../hooks/useHonorarios'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import type { THonorarioMensual } from '../types'

type Props = {
  clienteId: string
  actual: THonorarioMensual
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditarHonorarioForm({ clienteId, actual, onSuccess, onCancel }: Props) {
  const editar = useEditarHonorarioManual(clienteId)
  const esCorreccionDeHoy = actual.vigente_desde === toLocalDateInputValue()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TEditarHonorarioForm>({
    resolver: zodResolver(editarHonorarioSchema) as unknown as Resolver<TEditarHonorarioForm>,
    defaultValues: {
      monto: String(actual.monto),
      frecuencia_ajuste_meses: String(actual.frecuencia_ajuste_meses),
      observacion: '',
    },
  })

  async function onSubmit(data: TEditarHonorarioForm) {
    const result = await editar.mutateAsync({
      monto: Number(data.monto),
      frecuencia: Number(data.frecuencia_ajuste_meses),
      observacion: data.observacion,
    })
    if (result.ok) onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="border-border bg-muted/20 text-muted-foreground rounded-md border px-3 py-2 text-xs">
        {esCorreccionDeHoy ? (
          <>
            El honorario vigente ({formatMoney(actual.monto)}) se cargó hoy, así que esto lo{' '}
            <strong>corrige</strong>: no abre otra fila en el historial.
          </>
        ) : (
          <>
            Cambiar el monto a mano cierra el honorario de {formatMoney(actual.monto)} y abre uno
            nuevo desde hoy. La observación queda en el historial como{' '}
            <strong>modificación manual</strong>, para saber después por qué varió.
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="monto"
          label="Nuevo monto mensual *"
          type="number"
          step="0.01"
          min="0.01"
          error={errors.monto?.message}
          disabled={editar.isPending}
          {...register('monto')}
        />
        <Input
          id="frecuencia_ajuste_meses"
          label="Frecuencia de ajuste (meses) *"
          type="number"
          min="1"
          max="24"
          error={errors.frecuencia_ajuste_meses?.message}
          disabled={editar.isPending}
          {...register('frecuencia_ajuste_meses')}
        />
      </div>

      <Textarea
        id="observacion"
        label="Observación *"
        placeholder="Ej: tomó 2 empleados más y le sumamos ISIB"
        error={errors.observacion?.message}
        disabled={editar.isPending}
        {...register('observacion')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={editar.isPending}>
          {editar.isPending ? 'Guardando...' : 'Guardar honorario'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={editar.isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
