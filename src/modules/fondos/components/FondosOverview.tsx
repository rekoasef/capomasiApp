'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useSaldoFondos,
  useMovimientosFondos,
  useRegistrarMovimiento,
  useEliminarMovimiento,
  useTransferirFondos,
} from '../hooks/useFondos'
import {
  fondoMovimientoSchema,
  transferenciaFondosSchema,
  type TFondoMovimientoForm,
  type TTransferenciaFondosForm,
} from '../schemas/fondoSchema'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { PaginationControls } from '@/shared/components/PaginationControls'
import { formatMoney } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_CONCEPTOS_FONDOS,
  FALLBACK_TIPOS_MOVIMIENTO_FONDOS,
} from '@/shared/lib/parametros'

const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  MOVIMIENTO: 'Movimiento',
}

const CUENTAS_TRANSFERIBLES: { value: TTransferenciaFondosForm['origen']; label: string }[] = [
  { value: 'banco', label: 'Banco' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'usd', label: 'Dólares' },
  { value: 'taralo', label: 'Taralo' },
]

const PAGE_SIZE = 25

export function FondosOverview() {
  const { data: saldo, isLoading: loadingSaldo } = useSaldoFondos()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(0)
  const {
    data: movsData,
    isLoading: loadingMovs,
    error,
  } = useMovimientosFondos({
    desde: desde || undefined,
    hasta: hasta || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const movs = movsData?.rows
  const registrar = useRegistrarMovimiento()
  const eliminar = useEliminarMovimiento()
  const transferir = useTransferirFondos()
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
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const transferForm = useForm<TTransferenciaFondosForm>({
    resolver: zodResolver(
      transferenciaFondosSchema
    ) as unknown as Resolver<TTransferenciaFondosForm>,
    defaultValues: {
      origen: 'efectivo',
      destino: 'banco',
      importe: 0,
      fecha: toLocalDateInputValue(),
      concepto: '',
      notas: '',
    },
  })

  const handleTransferir = transferForm.handleSubmit((data) => {
    transferir.mutate(data, {
      onSuccess: (r) => {
        if (r.ok) {
          transferForm.reset()
          setShowTransferForm(false)
        }
      },
    })
  })

  const form = useForm<TFondoMovimientoForm>({
    resolver: zodResolver(fondoMovimientoSchema) as unknown as Resolver<TFondoMovimientoForm>,
    defaultValues: {
      tipo_movimiento: 'INGRESO',
      fecha: toLocalDateInputValue(),
      concepto: '',
      importe_banco: 0,
      importe_efectivo: 0,
      importe_usd: 0,
      importe_taralo: 0,
      notas: '',
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    registrar.mutate(data, {
      onSuccess: (r) => {
        if (r.ok) {
          form.reset()
          setShowForm(false)
        }
      },
    })
  })

  return (
    <div className="space-y-6">
      {/* Saldo cards */}
      {loadingSaldo ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-none" />
          ))}
        </div>
      ) : (
        saldo && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: 'Banco', value: saldo.saldo_banco },
              { label: 'Cheques en cartera', value: saldo.saldo_cheques_cartera },
              { label: 'Efectivo', value: saldo.saldo_efectivo },
              { label: 'Dólares', value: saldo.saldo_usd },
              { label: 'Taralo', value: saldo.saldo_taralo },
            ].map(({ label, value }) => (
              <div key={label} className="border-border border p-4">
                <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                  {label}
                </p>
                <p
                  className={`mt-1 text-xl font-bold tabular-nums ${value < 0 ? 'text-danger' : ''}`}
                >
                  {formatMoney(value)}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Movimientos</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="Desde"
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value)
              setPage(0)
            }}
          />
          <Input
            label="Hasta"
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value)
              setPage(0)
            }}
          />
          {(desde || hasta) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDesde('')
                setHasta('')
                setPage(0)
              }}
            >
              Limpiar
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowTransferForm((v) => !v)}>
              <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
              Transferir
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Registrar
            </Button>
          )}
        </div>
      </div>

      {showTransferForm && (
        <form onSubmit={handleTransferir} className="border-border space-y-3 border p-4">
          <p className="text-sm font-medium">Transferir entre cuentas</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Desde *
              </label>
              <select
                {...transferForm.register('origen')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                {CUENTAS_TRANSFERIBLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Hacia *
              </label>
              <select
                {...transferForm.register('destino')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                {CUENTAS_TRANSFERIBLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {transferForm.formState.errors.destino && (
                <p className="text-danger mt-1 text-[11px]">
                  {transferForm.formState.errors.destino.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Importe *"
              type="number"
              step="0.01"
              min="0.01"
              {...transferForm.register('importe', { valueAsNumber: true })}
              error={transferForm.formState.errors.importe?.message}
            />
            <Input label="Fecha *" type="date" {...transferForm.register('fecha')} />
          </div>
          <Input
            label="Motivo *"
            placeholder="Ej: Depósito de efectivo en cuenta"
            {...transferForm.register('concepto')}
            error={transferForm.formState.errors.concepto?.message}
          />
          <Textarea label="Notas (opcional)" {...transferForm.register('notas')} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={transferir.isPending}>
              {transferir.isPending ? 'Guardando...' : 'Transferir'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowTransferForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="border-border space-y-3 border p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo *
              </label>
              <select
                {...form.register('tipo_movimiento')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                {tiposMovimiento.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Fecha *" type="date" {...form.register('fecha')} />
            <Input label="N° Comprobante" {...form.register('nro_comprobante')} />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Concepto *
            </label>
            <select
              {...form.register('concepto')}
              className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {conceptosFondos.map((option) => (
                <option key={option.value} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
            {form.formState.errors.concepto && (
              <p className="text-danger mt-1 text-[11px]">
                {form.formState.errors.concepto.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input
              label="Banco $"
              type="number"
              step="0.01"
              min="0"
              {...form.register('importe_banco', { valueAsNumber: true })}
            />
            <Input
              label="Efectivo $"
              type="number"
              step="0.01"
              min="0"
              {...form.register('importe_efectivo', { valueAsNumber: true })}
            />
            <Input
              label="Dólares $"
              type="number"
              step="0.01"
              min="0"
              {...form.register('importe_usd', { valueAsNumber: true })}
            />
            <Input
              label="Taralo $"
              type="number"
              step="0.01"
              min="0"
              {...form.register('importe_taralo', { valueAsNumber: true })}
            />
          </div>
          <Textarea
            label="Observación"
            placeholder="Detalle opcional del movimiento..."
            {...form.register('notas')}
          />
          {form.formState.errors.root && (
            <p className="text-danger text-xs">{form.formState.errors.root.message}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={registrar.isPending}>
              {registrar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {loadingMovs ? (
        <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !movs?.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin movimientos registrados
        </p>
      ) : (
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b-2">
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Fecha
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Tipo
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Concepto
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Banco
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Cheques cartera
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Efectivo
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Dólares
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Taralo
                </th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {movs.map((m, i) => (
                <tr
                  key={m.id}
                  className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                >
                  <td className="text-muted-foreground px-4 py-2.5">{m.fecha}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase ${
                        m.tipo_movimiento === 'INGRESO'
                          ? 'text-success'
                          : m.tipo_movimiento === 'EGRESO'
                            ? 'text-danger'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {TIPO_LABEL[m.tipo_movimiento]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {m.concepto}
                    {m.notas && <p className="text-muted-foreground mt-0.5 text-xs">{m.notas}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.importe_banco > 0 ? formatMoney(m.importe_banco) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.importe_cheques_cartera > 0 ? formatMoney(m.importe_cheques_cartera) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.importe_efectivo > 0 ? formatMoney(m.importe_efectivo) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.importe_usd > 0 ? formatMoney(m.importe_usd) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.importe_taralo > 0 ? formatMoney(m.importe_taralo) : '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setDeleteId(m.id)}
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            total={movsData?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar movimiento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) eliminar.mutate(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
