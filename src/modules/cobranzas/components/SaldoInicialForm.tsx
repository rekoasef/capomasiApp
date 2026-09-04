'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { saldoInicialSchema, type TSaldoInicialForm } from '../schemas/saldoInicialSchema'
import { useSaldoInicialCliente, useGuardarSaldoInicial } from '../hooks/useCobranzas'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { formatMoney } from '@/shared/utils/formatters'
import type { TSaldoInicial } from '../types'

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
}: Props & { actual: TSaldoInicial | null }) {
  const guardar = useGuardarSaldoInicial(clienteId)
  const [tipo, setTipo] = useState<'DEUDA' | 'FAVOR'>(actual?.tipo ?? 'DEUDA')
  const aFavor = tipo === 'FAVOR'
  const imputado = actual?.imputado ?? 0

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TSaldoInicialForm>({
    resolver: zodResolver(saldoInicialSchema) as Resolver<TSaldoInicialForm>,
    defaultValues: {
      cliente_id: clienteId,
      tipo: actual?.tipo ?? 'DEUDA',
      fecha_liquidacion: actual?.fecha ?? toLocalDateInputValue(),
      importe: actual?.importe,
      detalle: actual?.detalle ?? '',
    },
  })

  async function onSubmit(data: TSaldoInicialForm) {
    const result = await guardar.mutateAsync({ ...data, tipo })
    if (result.ok) onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <div className="border-border bg-muted/30 flex gap-1 rounded-md border p-1">
        <TipoTab
          activo={!aFavor}
          onClick={() => setTipo('DEUDA')}
          disabled={guardar.isPending}
          label="Me debía"
        />
        <TipoTab
          activo={aFavor}
          onClick={() => setTipo('FAVOR')}
          disabled={guardar.isPending}
          label="Tenía a favor"
        />
      </div>

      <p className="border-border bg-muted/20 text-muted-foreground rounded-md border px-3 py-2 text-xs">
        {aFavor ? (
          <>
            La plata que el cliente tenía a favor antes del sistema (pagó de más o adelantado).
            Queda como <strong>saldo a favor</strong> en la cuenta corriente y se puede imputar a
            las facturas que salgan de acá en adelante, pero{' '}
            <strong>no entra a fondos ni cuenta como cobranza</strong>: esa plata ya había entrado.
          </>
        ) : (
          <>
            La deuda que el cliente traía de antes del sistema. Suma al saldo de la cuenta corriente
            y se le pueden imputar los cobros que entren, pero{' '}
            <strong>no genera factura ni cuenta como ingreso</strong> en el dashboard ni en los
            reportes, así que no duplica lo que ya está en Facturación histórica.
          </>
        )}
      </p>

      {actual && imputado > 0 && (
        <p className="text-muted-foreground text-xs">
          {actual.tipo === 'DEUDA'
            ? `Ya se imputaron ${formatMoney(imputado)} contra este saldo inicial: no se puede dejar por debajo de ese importe ni pasarlo a saldo a favor.`
            : `Ya se aplicaron ${formatMoney(imputado)} de este saldo a favor a facturas: no se puede dejar por debajo de ese importe ni pasarlo a deuda.`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="importe"
          label={aFavor ? 'Saldo a favor *' : 'Saldo que debía *'}
          type="number"
          step="0.01"
          min="0.01"
          error={errors.importe?.message}
          disabled={guardar.isPending}
          {...register('importe')}
        />
        <Input
          id="fecha_liquidacion"
          label={aFavor ? 'Saldo al día *' : 'Deuda al día *'}
          type="date"
          error={errors.fecha_liquidacion?.message}
          disabled={guardar.isPending}
          {...register('fecha_liquidacion')}
        />
      </div>

      <Textarea
        id="detalle"
        label="Detalle (opcional)"
        placeholder={
          aFavor ? 'Ej: pago adelantado de enero' : 'Ej: saldo pendiente al cierre del Excel'
        }
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

function TipoTab({
  activo,
  onClick,
  disabled,
  label,
}: {
  activo: boolean
  onClick: () => void
  disabled: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded px-3 py-1 text-sm transition ${
        activo
          ? 'bg-surface text-foreground font-medium shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}
