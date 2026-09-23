'use client'

import type {
  FieldArrayWithId,
  FieldErrors,
  UseFormRegister,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from 'react-hook-form'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'
import { totalMedios, type TMedioPagoForm } from '../schemas/reciboSchema'
import { Plus, X } from 'lucide-react'

export const MEDIO_VACIO = { tipo_pago: 'TRANSFERENCIA', importe: 0 } as const

// La parte del formulario que pregunta cómo pagó el cliente. La comparten
// el alta del recibo y la edición: las dos manejan el mismo array de
// medios, y tenerlo dos veces garantizaba que se despeguen.
//
// Se tipa contra la forma mínima que necesita — un objeto con `medios` —
// en vez de contra cada formulario, porque los genéricos de React Hook
// Form no dejan pasar un UseFormReturn de un tipo más ancho. Cada form
// castea una vez al llamarlo.
export type TMediosForm = { medios: TMedioPagoForm[] }

type Props = {
  fields: FieldArrayWithId<TMediosForm, 'medios', 'id'>[]
  register: UseFormRegister<TMediosForm>
  errors: FieldErrors<TMediosForm>
  medios: TMedioPagoForm[] | undefined
  append: UseFieldArrayAppend<TMediosForm, 'medios'>
  remove: UseFieldArrayRemove
  disabled?: boolean
  tiposPago: { value: string; label: string }[]
  cuentas: { value: string; label: string }[]
}

export function MediosPagoFields({
  fields,
  register,
  errors,
  medios,
  append,
  remove,
  disabled = false,
  tiposPago,
  cuentas,
}: Props) {
  const total = totalMedios(medios ?? [])

  return (
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
                  disabled={disabled}
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
                  disabled={disabled || tipo === 'USD'}
                  {...register(`medios.${index}.importe`)}
                />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
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
                disabled={disabled}
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
                  disabled={disabled}
                  {...register(`medios.${index}.importe_usd`)}
                />
                <Input
                  id={`medios.${index}.tipo_cambio`}
                  label="Tipo de cambio *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  error={medioErrors?.tipo_cambio?.message}
                  disabled={disabled}
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
                    disabled={disabled}
                    {...register(`medios.${index}.cheque_numero`)}
                  />
                  <Input
                    id={`medios.${index}.cheque_banco`}
                    label="Banco *"
                    error={medioErrors?.cheque_banco?.message}
                    disabled={disabled}
                    {...register(`medios.${index}.cheque_banco`)}
                  />
                </div>
                <Input
                  id={`medios.${index}.cheque_fecha_cobro`}
                  label="Fecha de cobro"
                  type="date"
                  disabled={disabled}
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
        disabled={disabled}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Agregar otro medio de pago
      </Button>
    </div>
  )
}
