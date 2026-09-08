'use client'

import { useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { pagoGastoSchema, type TPagoGastoForm } from '../schemas/pagoGastoSchema'
import { useCategoriasGastos } from '../hooks/useCategoriasGastos'
import { useActualizarPagoGasto, useRegistrarPagoGasto } from '../hooks/usePagosGastos'
import { MEDIOS_PAGO_GASTO, type TPagoGastoDetalle, type TProximoVencimiento } from '../types'

interface RegistrarPagoFormProps {
  vencimiento?: TProximoVencimiento
  pago?: TPagoGastoDetalle
  onCancel: () => void
  onSaved: () => void
}

export function RegistrarPagoForm({
  vencimiento,
  pago,
  onCancel,
  onSaved,
}: RegistrarPagoFormProps) {
  const { data: categorias = [] } = useCategoriasGastos()
  const registrar = useRegistrarPagoGasto()
  const actualizar = useActualizarPagoGasto()

  const defaultValues = useMemo<Partial<TPagoGastoForm>>(
    () => ({
      categoria_id: vencimiento?.categoria_id ?? pago?.categoria_id ?? categorias[0]?.id ?? '',
      gasto_recurrente_id: vencimiento?.gasto_id ?? pago?.gasto_recurrente_id ?? null,
      concepto: pago?.concepto ?? vencimiento?.descripcion ?? '',
      fecha_pago: pago?.fecha_pago ?? toLocalDateInputValue(),
      medio_pago: pago?.medio_pago ?? 'TRANSFERENCIA',
      importe: pago?.importe,
      comprobante_url: pago?.comprobante_url,
      notas: pago?.notas,
    }),
    [categorias, pago, vencimiento]
  )

  const form = useForm<TPagoGastoForm>({
    resolver: zodResolver(pagoGastoSchema) as Resolver<TPagoGastoForm>,
    values: defaultValues as TPagoGastoForm,
  })

  const isLockedToRecurrente = !!vencimiento || !!pago?.gasto_recurrente_id

  const handleSubmit = form.handleSubmit((data) => {
    const options = {
      onSuccess: (result: { ok: boolean }) => {
        if (result.ok) onSaved()
      },
    }
    if (pago) {
      actualizar.mutate({ id: pago.id, form: data }, options)
      return
    }
    registrar.mutate(data, options)
  })

  const isPending = registrar.isPending || actualizar.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {vencimiento && (
        <div className="border-border bg-muted/30 border px-3 py-2">
          <p className="text-sm font-semibold">{vencimiento.descripcion}</p>
          <p className="text-muted-foreground text-xs">
            {vencimiento.categoria_nombre} · vence{' '}
            {formatDate(vencimiento.proxima_fecha_vencimiento)}
          </p>
        </div>
      )}

      {isLockedToRecurrente ? (
        <>
          <input type="hidden" {...form.register('categoria_id')} />
          <input type="hidden" {...form.register('gasto_recurrente_id')} />
        </>
      ) : (
        <div>
          <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
            Categoría *
          </label>
          <select
            {...form.register('categoria_id')}
            className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          >
            <option value="">Seleccionar...</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
          {form.formState.errors.categoria_id && (
            <p className="text-danger mt-1 text-[11px]">
              {form.formState.errors.categoria_id.message}
            </p>
          )}
        </div>
      )}

      <Input
        label="Concepto *"
        {...form.register('concepto')}
        error={form.formState.errors.concepto?.message}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fecha *"
          type="date"
          {...form.register('fecha_pago')}
          error={form.formState.errors.fecha_pago?.message}
        />
        <div>
          <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
            Medio *
          </label>
          <select
            {...form.register('medio_pago')}
            className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          >
            {MEDIOS_PAGO_GASTO.map((medio) => (
              <option key={medio.value} value={medio.value}>
                {medio.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Importe *"
        type="number"
        step="0.01"
        min="0"
        {...form.register('importe', { valueAsNumber: true })}
        error={form.formState.errors.importe?.message}
      />

      <Input
        label="Comprobante"
        placeholder="https://..."
        {...form.register('comprobante_url')}
        error={form.formState.errors.comprobante_url?.message}
      />

      <Input label="Notas" {...form.register('notas')} />

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando...' : pago ? 'Actualizar' : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
