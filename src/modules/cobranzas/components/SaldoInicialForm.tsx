'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { saldoInicialSchema, type TSaldoInicialForm } from '../schemas/saldoInicialSchema'
import { useSaldoInicialCliente, useGuardarSaldoInicial } from '../hooks/useCobranzas'
import { calcularTotalImputado } from '../services/calcularSaldo'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { formatMoney } from '@/shared/utils/formatters'
import type { TLiquidacionConImputaciones } from '../types'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function SaldoInicialForm({ clienteId, onSuccess, onCancel }: Props) {
  const { data: actual, isLoading } = useSaldoInicialCliente(clienteId)

  if (isLoading) return <Skeleton className="h-40 w-full" />

  return (
    <Campos
      clienteId={clienteId}
      actual={actual ?? null}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}

function Campos({
  clienteId,
  actual,
  onSuccess,
  onCancel,
}: Props & { actual: TLiquidacionConImputaciones | null }) {
  const guardar = useGuardarSaldoInicial(clienteId)
  const cobrado = actual ? calcularTotalImputado(actual.imputaciones) : 0

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TSaldoInicialForm>({
    resolver: zodResolver(saldoInicialSchema) as Resolver<TSaldoInicialForm>,
    defaultValues: {
      cliente_id: clienteId,
      fecha_liquidacion: actual?.fecha_liquidacion ?? toLocalDateInputValue(),
      importe: actual?.importe_liquidado,
      detalle: actual?.detalle ?? '',
    },
  })

  async function onSubmit(data: TSaldoInicialForm) {
    const result = await guardar.mutateAsync(data)
    if (result.ok) onSuccess?.()
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <p className="border-border bg-muted/20 text-muted-foreground rounded-md border px-3 py-2 text-xs">
        La deuda que el cliente traía de antes del sistema. Suma al saldo de la cuenta corriente y
        se le pueden imputar los cobros que entren, pero{' '}
        <strong>no genera factura ni cuenta como ingreso</strong> en el dashboard ni en los
        reportes, así que no duplica lo que ya está en Facturación histórica.
      </p>

      {actual && cobrado > 0 && (
        <p className="text-muted-foreground text-xs">
          Ya se imputaron {formatMoney(cobrado)} contra este saldo inicial: no se puede dejar por
          debajo de ese importe.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="importe"
          label="Saldo que debía *"
          type="number"
          step="0.01"
          min="0.01"
          error={errors.importe?.message}
          disabled={guardar.isPending}
          {...register('importe')}
        />
        <Input
          id="fecha_liquidacion"
          label="Deuda al día *"
          type="date"
          error={errors.fecha_liquidacion?.message}
          disabled={guardar.isPending}
          {...register('fecha_liquidacion')}
        />
      </div>

      <Textarea
        id="detalle"
        label="Detalle (opcional)"
        placeholder="Ej: saldo pendiente al cierre del Excel"
        disabled={guardar.isPending}
        {...register('detalle')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando...' : actual ? 'Actualizar saldo' : 'Cargar saldo'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={guardar.isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
