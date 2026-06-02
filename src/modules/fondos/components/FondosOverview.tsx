'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSaldoFondos, useMovimientosFondos, useRegistrarMovimiento, useEliminarMovimiento } from '../hooks/useFondos'
import { fondoMovimientoSchema, type TFondoMovimientoForm } from '../schemas/fondoSchema'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { formatMoney } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_CONCEPTOS_FONDOS,
  FALLBACK_TIPOS_MOVIMIENTO_FONDOS,
} from '@/shared/lib/parametros'

const TIPO_LABEL: Record<string, string> = {
  INGRESO:    'Ingreso',
  EGRESO:     'Egreso',
  MOVIMIENTO: 'Movimiento',
}

export function FondosOverview() {
  const { data: saldo, isLoading: loadingSaldo } = useSaldoFondos()
  const { data: movs, isLoading: loadingMovs, error } = useMovimientosFondos()
  const registrar = useRegistrarMovimiento()
  const eliminar  = useEliminarMovimiento()
  const { isAdmin } = useAuth()
  const { data: tiposMovimiento = FALLBACK_TIPOS_MOVIMIENTO_FONDOS } = useParametros({
    categorias: ['TIPO_MOV_FONDOS'],
    fallback: FALLBACK_TIPOS_MOVIMIENTO_FONDOS,
  })
  const { data: conceptosFondos = FALLBACK_CONCEPTOS_FONDOS } = useParametros({
    categorias: ['CONCEPTO_FONDOS', 'CONCEPTO_PLANILLA_FONDOS'],
    fallback: FALLBACK_CONCEPTOS_FONDOS,
  })

  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<TFondoMovimientoForm>({
    resolver: zodResolver(fondoMovimientoSchema) as unknown as Resolver<TFondoMovimientoForm>,
    defaultValues: {
      tipo_movimiento: 'INGRESO',
      fecha: toLocalDateInputValue(),
      concepto: '',
      importe_banco: 0,
      importe_efectivo: 0,
      importe_usd: 0,
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    registrar.mutate(data, {
      onSuccess: (r) => {
        if (r.ok) { form.reset(); setShowForm(false) }
      },
    })
  })

  return (
    <div className="space-y-6">
      {/* Saldo cards */}
      {loadingSaldo ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-none" />)}
        </div>
      ) : saldo && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Banco',     value: saldo.saldo_banco },
            { label: 'Efectivo',  value: saldo.saldo_efectivo },
            { label: 'USD',       value: saldo.saldo_usd },
          ].map(({ label, value }) => (
            <div key={label} className="border border-border p-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{label}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${value < 0 ? 'text-danger' : ''}`}>
                {formatMoney(value)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Movimientos</h3>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Registrar
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Tipo *</label>
              <select
                {...form.register('tipo_movimiento')}
                className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {tiposMovimiento.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <Input label="Fecha *" type="date" {...form.register('fecha')} />
            <Input label="N° Comprobante" {...form.register('nro_comprobante')} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Concepto *</label>
            <select
              {...form.register('concepto')}
              className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Seleccionar...</option>
              {conceptosFondos.map((option) => (
                <option key={option.value} value={option.label}>{option.label}</option>
              ))}
            </select>
            {form.formState.errors.concepto && (
              <p className="mt-1 text-[11px] text-danger">{form.formState.errors.concepto.message}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Banco $" type="number" step="0.01" min="0" {...form.register('importe_banco', { valueAsNumber: true })} />
            <Input label="Efectivo $" type="number" step="0.01" min="0" {...form.register('importe_efectivo', { valueAsNumber: true })} />
            <Input label="USD $" type="number" step="0.01" min="0" {...form.register('importe_usd', { valueAsNumber: true })} />
          </div>
          {form.formState.errors.root && <p className="text-xs text-danger">{form.formState.errors.root.message}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={registrar.isPending}>{registrar.isPending ? 'Guardando...' : 'Guardar'}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {loadingMovs ? (
        <div className="space-y-px">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : !movs?.length ? (
        <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin movimientos registrados</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Fecha</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Concepto</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Banco</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Efectivo</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">USD</th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {movs.map((m, i) => (
                <tr key={m.id} className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.fecha}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${
                      m.tipo_movimiento === 'INGRESO' ? 'text-success' : m.tipo_movimiento === 'EGRESO' ? 'text-danger' : 'text-muted-foreground'
                    }`}>
                      {TIPO_LABEL[m.tipo_movimiento]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{m.concepto}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.importe_banco > 0 ? formatMoney(m.importe_banco) : '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.importe_efectivo > 0 ? formatMoney(m.importe_efectivo) : '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.importe_usd > 0 ? formatMoney(m.importe_usd) : '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setDeleteId(m.id)} className="p-1 text-muted-foreground hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar movimiento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteId) eliminar.mutate(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
