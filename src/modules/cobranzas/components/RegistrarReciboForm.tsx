'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reciboSchema, type TReciboForm } from '../schemas/reciboSchema'
import { calcularImportePagoUSD } from '../services/calcularSaldo'
import { useRegistrarRecibo } from '../hooks/useCobranzas'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_CUENTAS_BANCARIAS, FALLBACK_TIPOS_PAGO_COBRANZAS } from '@/shared/lib/parametros'
import { formatMoney } from '@/shared/utils/formatters'

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
    formState: { errors },
  } = useForm<TReciboForm>({
    resolver: zodResolver(reciboSchema) as unknown as Resolver<TReciboForm>,
    defaultValues: {
      cliente_id: clienteId,
      tipo_pago: 'TRANSFERENCIA',
      fecha: toLocalDateInputValue(),
      imputaciones: [],
    },
  })

  const tipoPago = watch('tipo_pago')
  const importeUsd = watch('importe_usd')
  const tipoCambio = watch('tipo_cambio')
  const vuelto = Number(watch('vuelto_efectivo') || 0)
  const importeArs =
    tipoPago === 'USD' && importeUsd && tipoCambio
      ? calcularImportePagoUSD(Number(importeUsd), Number(tipoCambio))
      : null

  async function onSubmit(data: TReciboForm) {
    const result = await registrar.mutateAsync(data)
    if (result.ok) {
      reset()
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_pago"
          label="Tipo de pago *"
          options={tiposPago}
          error={errors.tipo_pago?.message}
          disabled={registrar.isPending}
          {...register('tipo_pago')}
        />
        <Input
          id="fecha"
          label="Fecha *"
          type="date"
          error={errors.fecha?.message}
          disabled={registrar.isPending}
          {...register('fecha')}
        />
      </div>

      <Input
        id="importe"
        label="Importe ARS *"
        type="number"
        step="0.01"
        min="0.01"
        error={errors.importe?.message}
        disabled={registrar.isPending}
        {...register('importe')}
      />

      {tipoPago === 'TRANSFERENCIA' && (
        <Select
          id="cuenta_bancaria"
          label="Cuenta bancaria"
          options={cuentas}
          placeholder="Seleccionar cuenta"
          error={errors.cuenta_bancaria?.message}
          disabled={registrar.isPending}
          {...register('cuenta_bancaria')}
        />
      )}

      {tipoPago === 'USD' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="importe_usd"
            label="Importe USD *"
            type="number"
            step="0.01"
            min="0.01"
            error={errors.importe_usd?.message}
            disabled={registrar.isPending}
            {...register('importe_usd')}
          />
          <div>
            <Input
              id="tipo_cambio"
              label="Tipo de cambio *"
              type="number"
              step="0.01"
              min="0.01"
              error={errors.tipo_cambio?.message}
              disabled={registrar.isPending}
              {...register('tipo_cambio')}
            />
            {importeArs !== null && (
              <p className="text-muted-foreground mt-1 text-xs">= {formatMoney(importeArs)}</p>
            )}
          </div>
        </div>
      )}

      {tipoPago === 'CHEQUE' && (
        <div className="border-border space-y-3 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="cheque_numero"
              label="Número de cheque *"
              error={errors.cheque_numero?.message}
              disabled={registrar.isPending}
              {...register('cheque_numero')}
            />
            <Input
              id="cheque_banco"
              label="Banco *"
              error={errors.cheque_banco?.message}
              disabled={registrar.isPending}
              {...register('cheque_banco')}
            />
          </div>
          <Input
            id="cheque_fecha_cobro"
            label="Fecha de cobro"
            type="date"
            disabled={registrar.isPending}
            {...register('cheque_fecha_cobro')}
          />
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
                Se generarán 2 recibos: serie A por el cheque y serie C por el vuelto en efectivo.
              </p>
            )}
          </div>
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
