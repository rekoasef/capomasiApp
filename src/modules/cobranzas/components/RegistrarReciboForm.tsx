'use client'

import { useEffect } from 'react'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import type { FieldErrors, UseFieldArrayAppend, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reciboSchema, totalMedios, type TReciboForm } from '../schemas/reciboSchema'
import { calcularImportePagoUSD } from '../services/calcularSaldo'
import { useRegistrarRecibo } from '../hooks/useCobranzas'
import { MediosPagoFields, MEDIO_VACIO, type TMediosForm } from './MediosPagoFields'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_CUENTAS_BANCARIAS, FALLBACK_TIPOS_PAGO_COBRANZAS } from '@/shared/lib/parametros'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function RegistrarReciboForm({ clienteId, onSuccess, onCancel }: Props) {
  const registrar = useRegistrarRecibo(clienteId)
  const { data: tiposPago = FALLBACK_TIPOS_PAGO_COBRANZAS } = useParametros({
    categorias: ['TIPO_PAGO'],
    fallback: FALLBACK_TIPOS_PAGO_COBRANZAS,
  })
  const { data: cuentas = FALLBACK_CUENTAS_BANCARIAS } = useParametros({
    categorias: ['CUENTA_BANCARIA'],
    fallback: FALLBACK_CUENTAS_BANCARIAS,
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<TReciboForm>({
    resolver: zodResolver(reciboSchema) as unknown as Resolver<TReciboForm>,
    defaultValues: {
      cliente_id: clienteId,
      fecha: toLocalDateInputValue(),
      medios: [{ ...MEDIO_VACIO }],
      imputaciones: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'medios' })
  const medios = watch('medios')
  const total = totalMedios(medios ?? [])

  // El vuelto solo se ofrece sobre un cheque único: con varios medios no se
  // sabría de cuál sale la plata que se devuelve.
  const esChequeUnico = medios?.length === 1 && medios[0]?.tipo_pago === 'CHEQUE'
  const vuelto = Number(watch('vuelto_efectivo') || 0)

  // En USD el importe en pesos es el equivalente calculado, no se tipea.
  useEffect(() => {
    medios?.forEach((medio, i) => {
      if (medio.tipo_pago !== 'USD') return
      const equivalente =
        medio.importe_usd && medio.tipo_cambio
          ? calcularImportePagoUSD(Number(medio.importe_usd), Number(medio.tipo_cambio))
          : 0
      if (Number(medio.importe) !== equivalente) {
        setValue(`medios.${i}.importe`, equivalente, { shouldValidate: true })
      }
    })
  }, [medios, setValue])

  useEffect(() => {
    if (!esChequeUnico && vuelto > 0) {
      setValue('vuelto_efectivo', 0, { shouldValidate: true })
    }
  }, [esChequeUnico, vuelto, setValue])

  async function onSubmit(data: TReciboForm) {
    const result = await registrar.mutateAsync(data)
    if (result.ok) {
      reset({
        cliente_id: clienteId,
        fecha: toLocalDateInputValue(),
        medios: [{ ...MEDIO_VACIO }],
        imputaciones: [],
      })
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <Input
        id="fecha"
        label="Fecha *"
        type="date"
        error={errors.fecha?.message}
        disabled={registrar.isPending}
        {...register('fecha')}
      />

      <MediosPagoFields
        fields={fields}
        // El componente se tipa contra { medios } y no contra TReciboForm:
        // los genéricos de RHF no aceptan un formulario más ancho. Ver
        // MediosPagoFields.
        register={register as unknown as UseFormRegister<TMediosForm>}
        errors={errors as FieldErrors<TMediosForm>}
        medios={medios}
        append={append as unknown as UseFieldArrayAppend<TMediosForm, 'medios'>}
        remove={remove}
        disabled={registrar.isPending}
        tiposPago={tiposPago}
        cuentas={cuentas}
      />

      {esChequeUnico && (
        <div>
          <Input
            id="vuelto_efectivo"
            label="Vuelto en efectivo (opcional)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            error={errors.vuelto_efectivo?.message}
            disabled={registrar.isPending}
            {...register('vuelto_efectivo')}
          />
          {vuelto > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              El recibo queda por {formatMoney(total)}: {formatMoney(total - vuelto)} en el cheque y{' '}
              {formatMoney(vuelto)} que le devolvés en efectivo.
            </p>
          )}
        </div>
      )}

      <Textarea
        id="notas"
        label="Notas (opcional)"
        disabled={registrar.isPending}
        {...register('notas')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={registrar.isPending}>
          {registrar.isPending ? 'Registrando...' : 'Registrar recibo'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={registrar.isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
