'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ajusteSchema, type TAjusteForm } from '../schemas/honorarioSchema'
import { calcularNuevoHonorario } from '../services/calcularNuevoHonorario'
import { useAplicarAjuste } from '../hooks/useHonorarios'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'

type Props = {
  clienteId: string
  montoActual: number
  onSuccess?: () => void
}

export function AplicarAjusteForm({ clienteId, montoActual, onSuccess }: Props) {
  const aplicar = useAplicarAjuste(clienteId)
  const [porcentajePreview, setPorcentajePreview] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TAjusteForm>({
    resolver: zodResolver(ajusteSchema) as unknown as Resolver<TAjusteForm>,
  })

  const montoNuevo =
    porcentajePreview && !isNaN(Number(porcentajePreview)) && Number(porcentajePreview) > 0
      ? calcularNuevoHonorario(montoActual, Number(porcentajePreview))
      : null

  async function onSubmit(data: TAjusteForm) {
    const result = await aplicar.mutateAsync({
      porcentaje: Number(data.porcentaje),
      notas: data.notas,
    })
    if (result.ok) {
      reset()
      setPorcentajePreview('')
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <Input
            id="porcentaje"
            label="Porcentaje de ajuste *"
            placeholder="Ej: 12.5"
            type="number"
            step="0.01"
            min="0.01"
            error={errors.porcentaje?.message}
            disabled={aplicar.isPending}
            {...register('porcentaje', {
              onChange: (e) => setPorcentajePreview(e.target.value),
            })}
          />
        </div>
        <div className="space-y-0.5 pt-7 text-sm">
          <p className="text-muted-foreground">
            Actual: <span className="text-foreground font-medium">{formatMoney(montoActual)}</span>
          </p>
          {montoNuevo !== null && (
            <p className="text-success font-medium">Nuevo: {formatMoney(montoNuevo)}</p>
          )}
        </div>
      </div>

      <Textarea
        id="notas"
        label="Notas (opcional)"
        placeholder="Ej: Ajuste por inflación Marzo 2026"
        disabled={aplicar.isPending}
        {...register('notas')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={aplicar.isPending}>
          {aplicar.isPending ? 'Aplicando...' : 'Aplicar ajuste'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            reset()
            setPorcentajePreview('')
          }}
          disabled={aplicar.isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
