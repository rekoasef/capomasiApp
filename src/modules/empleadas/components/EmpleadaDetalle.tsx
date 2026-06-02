'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useLiquidacionesEmpleada,
  useCrearLiquidacionEmpleada,
  useEliminarLiquidacionEmpleada,
  usePagosEmpleada,
  useRegistrarPagoEmpleada,
  useEmpleadaById,
} from '../hooks/useEmpleadas'
import { liquidacionEmpleadaSchema, pagoEmpleadaSchema } from '../schemas/empleadaSchema'
import type { TLiquidacionEmpleadaForm, TPagoEmpleadaForm } from '../schemas/empleadaSchema'
import type { TLiquidacionEmpleada, TPagoEmpleada } from '../types'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_CONCEPTOS_DESCUENTO_EMPLEADA,
  FALLBACK_CONCEPTOS_HABER_EMPLEADA,
} from '@/shared/lib/parametros'
import { ImportarComisionesModal } from './ImportarComisionesModal'
import { LegajoSection } from './LegajoSection'
import { ComisionesSection } from './ComisionesSection'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Tab = 'legajo' | 'comisiones' | 'liquidacion'

interface Props {
  empleadaId: string
}

export function EmpleadaDetalle({ empleadaId }: Props) {
  const [tab, setTab] = useState<Tab>('legajo')
  const { data: empleada, isLoading: loadingEmpleada } = useEmpleadaById(empleadaId)

  if (loadingEmpleada) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
  }

  if (!empleada) {
    return <p className="text-sm text-danger">No se encontró la empleada.</p>
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { id: 'legajo',      label: 'Legajo'     },
          { id: 'comisiones',  label: 'Comisiones' },
          { id: 'liquidacion', label: 'Liquidación' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'legajo' && (
        <LegajoSection empleada={empleada} />
      )}

      {tab === 'comisiones' && (
        <ComisionesSection empleada={empleada} />
      )}

      {tab === 'liquidacion' && (
        <LiquidacionTab empleadaId={empleadaId} />
      )}
    </div>
  )
}

// ── Tab: Liquidación ──────────────────────────────────────────

function LiquidacionTab({ empleadaId }: { empleadaId: string }) {
  const hoy  = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes,  setMes]  = useState(hoy.getMonth() + 1)

  const ANIOS = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - i)

  const { data: liquidaciones, isLoading: loadingLiq, error: errorLiq } = useLiquidacionesEmpleada(empleadaId, anio)
  const { data: pagos,         isLoading: loadingPag, error: errorPag  } = usePagosEmpleada(empleadaId, anio)

  const liquidacionesMes = (liquidaciones ?? []).filter((l) => l.periodo_mes === mes)
  const pagosMes         = (pagos ?? []).filter((p) => p.periodo_mes === mes)

  const totalHaberes    = liquidacionesMes.filter((l) => l.tipo_concepto === 'HABER').reduce((s, l) => s + Number(l.importe), 0)
  const totalDescuentos = liquidacionesMes.filter((l) => l.tipo_concepto === 'DESCUENTO').reduce((s, l) => s + Number(l.importe), 0)
  const neto            = totalHaberes - totalDescuentos
  const totalPagado     = pagosMes.reduce((s, p) => s + Number(p.importe), 0)
  const saldo           = neto - totalPagado

  if (errorLiq || errorPag) {
    return <p className="text-sm text-danger">{errorLiq?.message ?? errorPag?.message}</p>
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Año</span>
          <div className="flex gap-1">
            {ANIOS.map((a) => (
              <button
                key={a}
                onClick={() => setAnio(a)}
                className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                  a === anio
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Mes</span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="border border-border bg-surface px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Resumen del período */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumenCard label="Haberes"    value={totalHaberes} />
        <ResumenCard label="Descuentos" value={totalDescuentos} className="text-danger" />
        <ResumenCard label="Neto"       value={neto}  bold />
        <ResumenCard label="Pendiente"  value={saldo} bold className={saldo > 0 ? 'text-danger' : 'text-success'} />
      </div>

      {/* Liquidaciones */}
      <LiquidacionesSection
        empleadaId={empleadaId}
        mes={mes}
        anio={anio}
        items={liquidacionesMes}
        isLoading={loadingLiq}
      />

      {/* Pagos */}
      <PagosSection
        empleadaId={empleadaId}
        mes={mes}
        anio={anio}
        items={pagosMes}
        isLoading={loadingPag}
        totalPagado={totalPagado}
      />
    </div>
  )
}

// ── ResumenCard ──────────────────────────────────────────────

function ResumenCard({
  label, value, bold, className,
}: {
  label: string
  value: number
  bold?: boolean
  className?: string
}) {
  return (
    <div className="border border-border bg-surface px-4 py-3">
      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base tabular-nums ${bold ? 'font-bold' : ''} ${className ?? ''}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}

// ── LiquidacionesSection ─────────────────────────────────────

function LiquidacionesSection({
  empleadaId, mes, anio, items, isLoading,
}: {
  empleadaId: string
  mes: number
  anio: number
  items: TLiquidacionEmpleada[]
  isLoading: boolean
}) {
  const { isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const crear    = useCrearLiquidacionEmpleada(empleadaId)
  const eliminar = useEliminarLiquidacionEmpleada(empleadaId)
  const { data: conceptosHaber = FALLBACK_CONCEPTOS_HABER_EMPLEADA } = useParametros({
    categorias: ['CONCEPTO_HABER_EMPLEADA', 'CONCEPTO_EMPLEADA_HABER'],
    fallback: FALLBACK_CONCEPTOS_HABER_EMPLEADA,
    valueField: 'descripcion',
    labelField: 'descripcion',
  })
  const { data: conceptosDescuento = FALLBACK_CONCEPTOS_DESCUENTO_EMPLEADA } = useParametros({
    categorias: ['CONCEPTO_DESCUENTO_EMPLEADA', 'CONCEPTO_EMPLEADA_DESCUENTO'],
    fallback: FALLBACK_CONCEPTOS_DESCUENTO_EMPLEADA,
    valueField: 'descripcion',
    labelField: 'descripcion',
  })

  const form = useForm<TLiquidacionEmpleadaForm>({
    resolver: zodResolver(liquidacionEmpleadaSchema),
    defaultValues: { empleada_id: empleadaId, tipo_concepto: 'HABER', periodo_mes: mes, periodo_anio: anio, concepto: '', importe: 0 },
  })

  const tipoConcepto = form.watch('tipo_concepto')
  const conceptos = tipoConcepto === 'HABER' ? conceptosHaber : conceptosDescuento

  const onSubmit = form.handleSubmit((data) => {
    crear.mutate(
      { ...data, periodo_mes: mes, periodo_anio: anio },
      {
        onSuccess: (r) => {
          if (r.ok) {
            form.reset({ empleada_id: empleadaId, tipo_concepto: 'HABER', periodo_mes: mes, periodo_anio: anio, concepto: '', importe: 0 })
            setShowForm(false)
          }
        },
      }
    )
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Liquidación — {MESES[mes - 1]} {anio}</h3>
        <div className="flex gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)}>
              Importar comisiones
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Agregar concepto
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="border border-border bg-surface p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Tipo</label>
              <select {...form.register('tipo_concepto')} className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="HABER">Haber</option>
                <option value="DESCUENTO">Descuento</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Concepto *</label>
              <select {...form.register('concepto')} className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Seleccionar...</option>
                {conceptos.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {form.formState.errors.concepto && (
                <p className="mt-1 text-[11px] text-danger">{form.formState.errors.concepto.message}</p>
              )}
            </div>
            <Input
              label="Importe *"
              type="number"
              step="0.01"
              min="0"
              {...form.register('importe', { valueAsNumber: true })}
              error={form.formState.errors.importe?.message}
            />
          </div>
          <Input label="Observaciones" {...form.register('observaciones')} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending}>{crear.isPending ? 'Guardando...' : 'Guardar'}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-px">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
      ) : !items.length ? (
        <p className="py-6 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin conceptos para este período</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Concepto</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Importe</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Observaciones</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{l.concepto}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${l.tipo_concepto === 'HABER' ? 'text-success' : 'text-danger'}`}>
                      {l.tipo_concepto === 'HABER' ? 'Haber' : 'Descuento'}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${l.tipo_concepto === 'DESCUENTO' ? 'text-danger' : ''}`}>
                    {formatMoney(Number(l.importe))}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.observaciones ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setDeleteId(l.id)} className="p-1 text-muted-foreground hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar concepto"
        description="Se eliminará este ítem de la liquidación."
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteId) eliminar.mutate(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />

      <ImportarComisionesModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        empleadaId={empleadaId}
        periodoMes={mes}
        periodoAnio={anio}
      />
    </div>
  )
}

// ── PagosSection ─────────────────────────────────────────────

function PagosSection({
  empleadaId, mes, anio, items, isLoading, totalPagado,
}: {
  empleadaId: string
  mes: number
  anio: number
  items: TPagoEmpleada[]
  isLoading: boolean
  totalPagado: number
}) {
  const [showForm, setShowForm] = useState(false)
  const registrar = useRegistrarPagoEmpleada(empleadaId)

  const form = useForm<TPagoEmpleadaForm>({
    resolver: zodResolver(pagoEmpleadaSchema),
    defaultValues: {
      empleada_id:  empleadaId,
      periodo_mes:  mes,
      periodo_anio: anio,
      tipo_pago:    'TRANSFERENCIA',
      importe:      0,
      fecha_pago:   toLocalDateInputValue(),
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    registrar.mutate(
      { ...data, periodo_mes: mes, periodo_anio: anio },
      {
        onSuccess: (r) => {
          if (r.ok) {
            form.reset({
              empleada_id: empleadaId, periodo_mes: mes, periodo_anio: anio,
              tipo_pago: 'TRANSFERENCIA', importe: 0,
              fecha_pago: toLocalDateInputValue(),
            })
            setShowForm(false)
          }
        },
      }
    )
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Pagos — {MESES[mes - 1]} {anio}
          {totalPagado > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">Total: {formatMoney(totalPagado)}</span>
          )}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Registrar pago
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="border border-border bg-surface p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Tipo *</label>
              <select {...form.register('tipo_pago')} className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <Input
              label="Importe *"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('importe', { valueAsNumber: true })}
              error={form.formState.errors.importe?.message}
            />
            <Input
              label="Fecha *"
              type="date"
              {...form.register('fecha_pago')}
              error={form.formState.errors.fecha_pago?.message}
            />
            <Input label="Cuenta bancaria" {...form.register('cuenta_bancaria')} />
          </div>
          <Input label="Notas" {...form.register('notas')} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={registrar.isPending}>{registrar.isPending ? 'Guardando...' : 'Guardar'}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-px">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
      ) : !items.length ? (
        <p className="py-6 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin pagos registrados para este período</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Fecha</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Importe</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 tabular-nums">{formatDate(p.fecha_pago)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{p.tipo_pago}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(Number(p.importe))}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.notas ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
