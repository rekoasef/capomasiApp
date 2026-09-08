'use client'

import { useEffect } from 'react'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reciboSchema, totalMedios, type TReciboForm } from '../schemas/reciboSchema'
import { calcularImportePagoUSD } from '../services/calcularSaldo'
import { useRegistrarRecibo } from '../hooks/useCobranzas'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_CUENTAS_BANCARIAS, FALLBACK_TIPOS_PAGO_COBRANZAS } from '@/shared/lib/parametros'
import { Plus, X } from 'lucide-react'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const MEDIO_VACIO = { tipo_pago: 'TRANSFERENCIA', importe: 0 } as const

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            Cómo pagó
          </span>
          <span className="text-muted-foreground text-xs">
            Total del recibo{' '}
            <strong className="text-foreground tabular-nums">{formatMoney(total)}</strong>
          </span>
        </div>

        {fields.map((field, index) => {
          const tipo = medios?.[index]?.tipo_pago
          const medioErrors = errors.medios?.[index]

          return (
            <div key={field.id} className="border-border space-y-3 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <Select
                    id={`medios.${index}.tipo_pago`}
                    label="Medio de pago *"
                    options={tiposPago}
                    error={medioErrors?.tipo_pago?.message}
                    disabled={registrar.isPending}
                    {...register(`medios.${index}.tipo_pago`)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    id={`medios.${index}.importe`}
                    label={tipo === 'USD' ? 'Importe ARS (calculado)' : 'Importe ARS *'}
                    type="number"
                    step="0.01"
                    min="0.01"
                    error={medioErrors?.importe?.message}
                    disabled={registrar.isPending || tipo === 'USD'}
                    {...register(`medios.${index}.importe`)}
                  />
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={registrar.isPending}
                    className="text-muted-foreground hover:text-danger mt-6 p-1.5"
                    title="Quitar este medio de pago"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {tipo === 'TRANSFERENCIA' && (
                <Select
                  id={`medios.${index}.cuenta_bancaria`}
                  label="Cuenta bancaria"
                  options={cuentas}
                  placeholder="Seleccionar cuenta"
                  error={medioErrors?.cuenta_bancaria?.message}
                  disabled={registrar.isPending}
                  {...register(`medios.${index}.cuenta_bancaria`)}
                />
              )}

              {tipo === 'USD' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id={`medios.${index}.importe_usd`}
                    label="Importe USD *"
                    type="number"
                    step="0.01"
                    min="0.01"
                    error={medioErrors?.importe_usd?.message}
                    disabled={registrar.isPending}
                    {...register(`medios.${index}.importe_usd`)}
                  />
                  <Input
                    id={`medios.${index}.tipo_cambio`}
                    label="Tipo de cambio *"
                    type="number"
                    step="0.01"
                    min="0.01"
                    error={medioErrors?.tipo_cambio?.message}
                    disabled={registrar.isPending}
                    {...register(`medios.${index}.tipo_cambio`)}
                  />
                </div>
              )}

              {tipo === 'CHEQUE' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id={`medios.${index}.cheque_numero`}
                      label="Número de cheque *"
                      error={medioErrors?.cheque_numero?.message}
                      disabled={registrar.isPending}
                      {...register(`medios.${index}.cheque_numero`)}
                    />
                    <Input
                      id={`medios.${index}.cheque_banco`}
                      label="Banco *"
                      error={medioErrors?.cheque_banco?.message}
                      disabled={registrar.isPending}
                      {...register(`medios.${index}.cheque_banco`)}
                    />
                  </div>
                  <Input
                    id={`medios.${index}.cheque_fecha_cobro`}
                    label="Fecha de cobro"
                    type="date"
                    disabled={registrar.isPending}
                    {...register(`medios.${index}.cheque_fecha_cobro`)}
                  />
                </div>
              )}
            </div>
          )
        })}

        {errors.medios?.message && <p className="text-danger text-xs">{errors.medios.message}</p>}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ ...MEDIO_VACIO })}
          disabled={registrar.isPending}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Agregar otro medio de pago
        </Button>
      </div>

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
