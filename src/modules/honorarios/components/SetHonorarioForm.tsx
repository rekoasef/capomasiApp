'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { setHonorarioSchema, type TSetHonorarioForm } from '../schemas/honorarioSchema'
import { useSetHonorarioInicial } from '../hooks/useHonorarios'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'

type Props = {
  clienteId: string
  onSuccess?: () => void
}

export function SetHonorarioForm({ clienteId, onSuccess }: Props) {
  const setInicial = useSetHonorarioInicial(clienteId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TSetHonorarioForm>({
    resolver: zodResolver(setHonorarioSchema) as unknown as Resolver<TSetHonorarioForm>,
    defaultValues: { frecuencia_ajuste_meses: '2' },
  })

  async function onSubmit(data: TSetHonorarioForm) {
    const result = await setInicial.mutateAsync({
      monto: Number(data.monto),
      frecuencia: Number(data.frecuencia_ajuste_meses),
      notas: data.notas,
    })
    if (result.ok) { reset(); onSuccess?.() }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="monto"
          label="Monto mensual *"
          placeholder="Ej: 85000"
          type="number"
          step="0.01"
          min="0.01"
          error={errors.monto?.message}
          disabled={setInicial.isPending}
          {...register('monto')}
        />
        <Input
          id="frecuencia_ajuste_meses"
          label="Frecuencia de ajuste (meses) *"
          type="number"
          min="1"
          max="24"
          error={errors.frecuencia_ajuste_meses?.message}
          disabled={setInicial.isPending}
          {...register('frecuencia_ajuste_meses')}
        />
      </div>
      <Textarea
        id="notas"
        label="Notas"
        placeholder="Observaciones..."
        disabled={setInicial.isPending}
        {...register('notas')}
      />
      <Button type="submit" size="sm" disabled={setInicial.isPending}>
        {setInicial.isPending ? 'Guardando...' : 'Establecer honorario'}
      </Button>
    </form>
  )
}
