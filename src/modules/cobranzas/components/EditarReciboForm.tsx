'use client'

import { useEffect } from 'react'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import type { FieldErrors, UseFieldArrayAppend, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editarReciboSchema, type TEditarReciboForm } from '../schemas/reciboSchema'
import { calcularImportePagoUSD } from '../services/calcularSaldo'
import { useEditarRecibo } from '../hooks/useCobranzas'
import { MediosPagoFields, MEDIO_VACIO, type TMediosForm } from './MediosPagoFields'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_CUENTAS_BANCARIAS, FALLBACK_TIPOS_PAGO_COBRANZAS } from '@/shared/lib/parametros'
import type { TReciboDisponible } from '../types'

type Props = {
  clienteId: string
  recibo: TReciboDisponible
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditarReciboForm({ clienteId, recibo, onSuccess, onCancel }: Props) {
  const editar = useEditarRecibo(clienteId)
  const { data: tiposPago = FALLBACK_TIPOS_PAGO_COBRANZAS } = useParametros({
    categorias: ['TIPO_PAGO'],
    fallback: FALLBACK_TIPOS_PAGO_COBRANZAS,
  })
  const { data: cuentas = FALLBACK_CUENTAS_BANCARIAS } = useParametros({
    categorias: ['CUENTA_BANCARIA'],
    fallback: FALLBACK_CUENTAS_BANCARIAS,
  })

  // Los medios guardados, traducidos a lo que pide el formulario. El
  // recibo viejo puede no tener medios (los anteriores a la 0073): en ese
  // caso se arma uno solo con la cabecera, que es lo que representa.
  const mediosIniciales =
    recibo.medios && recibo.medios.length > 0
      ? recibo.medios.map((m) => ({
          tipo_pago: m.tipo_pago,
          importe: Number(m.importe),
          cuenta_bancaria: m.cuenta_bancaria ?? undefined,
          importe_usd: m.importe_usd ? Number(m.importe_usd) : undefined,
          tipo_cambio: m.tipo_cambio ? Number(m.tipo_cambio) : undefined,
          // Los datos del papel viven en la tabla cheques. Al editar se
          // vuelven a pedir, porque el cheque se rehace.
          cheque_numero: undefined,
          cheque_banco: undefined,
          cheque_fecha_cobro: undefined,
        }))
      : [{ ...MEDIO_VACIO, importe: Number(recibo.importe ?? 0) }]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<TEditarReciboForm>({
    resolver: zodResolver(editarReciboSchema) as unknown as Resolver<TEditarReciboForm>,
    defaultValues: {
      recibo_id: recibo.id,
      fecha: recibo.fecha ?? '',
      medios: mediosIniciales,
      notas: recibo.notas ?? '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'medios' })
  const medios = watch('medios')

  // Igual que al registrar: en un medio en dólares el importe en pesos es
  // derivado, no se tipea.
  useEffect(() => {
    medios?.forEach((medio, i) => {
      if (medio.tipo_pago !== 'USD') return
      const equivalente = calcularImportePagoUSD(
        Number(medio.importe_usd) || 0,
        Number(medio.tipo_cambio) || 0
      )
      if (equivalente !== Number(medio.importe)) {
        setValue(`medios.${i}.importe`, equivalente, { shouldValidate: true })
      }
    })
  }, [medios, setValue])

  async function onSubmit(data: TEditarReciboForm) {
    const result = await editar.mutateAsync(data)
    if (result.ok) onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Recibo <strong className="text-foreground">{recibo.numero_recibo ?? 'sin número'}</strong>.
        El número y el cliente no cambian: se rehace cómo pagó. Si había un cheque, volvé a cargar
        sus datos — el anterior sale de la cartera.
      </p>

      <Input
        id="fecha"
        label="Fecha *"
        type="date"
        error={errors.fecha?.message}
        disabled={editar.isPending}
        {...register('fecha')}
      />

      <MediosPagoFields
        fields={fields}
        // Ver MediosPagoFields: se tipa contra { medios }, no contra este
        // formulario, porque los genéricos de RHF no aceptan uno más ancho.
        register={register as unknown as UseFormRegister<TMediosForm>}
        errors={errors as FieldErrors<TMediosForm>}
        medios={medios}
        append={append as unknown as UseFieldArrayAppend<TMediosForm, 'medios'>}
        remove={remove}
        disabled={editar.isPending}
        tiposPago={tiposPago}
        cuentas={cuentas}
      />

      <Textarea
        id="notas"
        label="Notas (opcional)"
        disabled={editar.isPending}
        {...register('notas')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={editar.isPending}>
          {editar.isPending ? 'Guardando...' : 'Guardar cambios'}
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
