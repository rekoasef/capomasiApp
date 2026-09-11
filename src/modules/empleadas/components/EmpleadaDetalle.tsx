'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  useLiquidacionesEmpleada,
  useCrearLiquidacionEmpleada,
  useEliminarLiquidacionEmpleada,
  usePagosEmpleada,
  useRegistrarPagoEmpleada,
  useActualizarPagoEmpleada,
  useEliminarPagoEmpleada,
  useEmpleadaById,
} from '../hooks/useEmpleadas'
import { liquidacionEmpleadaSchema, pagoEmpleadaSchema } from '../schemas/empleadaSchema'
import type { TLiquidacionEmpleadaForm, TPagoEmpleadaForm } from '../schemas/empleadaSchema'
import type { TLiquidacionEmpleada, TPagoEmpleada, TEmpleada } from '../types'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import {
  CONCEPTO_HORAS,
  calcularImporteHoras,
  calcularLiquidacionMes,
} from '../services/calcularLiquidacionMes'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Plus, Trash2, Pencil, KeyRound, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_CONCEPTOS_DESCUENTO_EMPLEADA,
  FALLBACK_CONCEPTOS_HABER_EMPLEADA,
} from '@/shared/lib/parametros'
import { ImportarComisionesModal } from './ImportarComisionesModal'
import { LegajoSection } from './LegajoSection'
import { ComisionesSection } from './ComisionesSection'
import { supabase } from '@/lib/supabase/client'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

type Tab = 'legajo' | 'comisiones' | 'liquidacion' | 'cuenta'

interface PrefillHaber {
  importe: number
  puntos: number
  nota?: string
}

interface Props {
  empleadaId: string
}

export function EmpleadaDetalle({ empleadaId }: Props) {
  const [tab, setTab] = useState<Tab>('legajo')
  const [prefillHaber, setPrefillHaber] = useState<PrefillHaber | null>(null)
  const { isAdmin } = useAuth()
  const { data: empleada, isLoading: loadingEmpleada } = useEmpleadaById(empleadaId)

  if (loadingEmpleada) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (!empleada) {
    return <p className="text-danger text-sm">No se encontró la empleada.</p>
  }

  const tabs = [
    { id: 'legajo' as Tab, label: 'Legajo' },
    { id: 'comisiones' as Tab, label: 'Comisiones' },
    { id: 'liquidacion' as Tab, label: 'Liquidación' },
    ...(isAdmin ? [{ id: 'cuenta' as Tab, label: 'Cuenta' }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-border flex gap-0 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'legajo' && <LegajoSection empleada={empleada} />}

      {tab === 'comisiones' && (
        <ComisionesSection
          empleada={empleada}
          onDescontadoPuntaje={(payload) => {
            setPrefillHaber(payload)
            setTab('liquidacion')
          }}
        />
      )}

      {tab === 'liquidacion' && (
        <LiquidacionTab
          empleadaId={empleadaId}
          valorHoraLegajo={empleada.valor_hora}
          prefillHaber={prefillHaber}
          onConsumePrefillHaber={() => setPrefillHaber(null)}
        />
      )}

      {tab === 'cuenta' && isAdmin && <CuentaSection empleada={empleada} />}
    </div>
  )
}

// ── Tab: Liquidación ──────────────────────────────────────────

function LiquidacionTab({
  empleadaId,
  valorHoraLegajo,
  prefillHaber,
  onConsumePrefillHaber,
}: {
  empleadaId: string
  valorHoraLegajo: number | null
  prefillHaber: PrefillHaber | null
  onConsumePrefillHaber: () => void
}) {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)

  const ANIOS = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - i)

  const {
    data: liquidaciones,
    isLoading: loadingLiq,
    error: errorLiq,
  } = useLiquidacionesEmpleada(empleadaId)
  const { data: pagos, isLoading: loadingPag, error: errorPag } = usePagosEmpleada(empleadaId)

  // Se traen todos los períodos, no solo el año elegido: el arrastre necesita
  // el historial completo para saber qué quedó de los meses anteriores.
  const liquidacionesMes = (liquidaciones ?? []).filter(
    (l) => l.periodo_anio === anio && l.periodo_mes === mes
  )
  const pagosMes = (pagos ?? []).filter((p) => p.periodo_anio === anio && p.periodo_mes === mes)

  const { totalHaberes, totalDescuentos, neto, totalPagado, saldoAnterior, pendiente } =
    calcularLiquidacionMes(liquidaciones ?? [], pagos ?? [], anio, mes)

  if (errorLiq || errorPag) {
    return <p className="text-danger text-sm">{errorLiq?.message ?? errorPag?.message}</p>
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-4 border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Año
          </span>
          <div className="flex gap-1">
            {ANIOS.map((a) => (
              <button
                key={a}
                onClick={() => setAnio(a)}
                className={`border px-2.5 py-1 text-xs font-semibold transition-colors ${
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
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Mes
          </span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="border-border bg-surface focus:ring-primary border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen del período */}
      <div
        className={`grid grid-cols-2 gap-3 ${saldoAnterior !== 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}
      >
        <ResumenCard label="Haberes" value={totalHaberes} />
        <ResumenCard label="Descuentos" value={totalDescuentos} className="text-danger" />
        <ResumenCard label="Neto" value={neto} bold />
        {saldoAnterior !== 0 && (
          <ResumenCard
            label={saldoAnterior > 0 ? 'Venía debiendo' : 'Pagado de más antes'}
            value={saldoAnterior}
            className={saldoAnterior > 0 ? 'text-danger' : 'text-success'}
          />
        )}
        <ResumenCard
          label="Pendiente"
          value={pendiente}
          bold
          className={pendiente > 0 ? 'text-danger' : 'text-success'}
        />
      </div>

      {saldoAnterior !== 0 && (
        <p className="text-muted-foreground -mt-3 text-xs">
          {saldoAnterior > 0
            ? `El pendiente incluye ${formatMoney(saldoAnterior)} que quedó sin pagar de meses anteriores.`
            : `El pendiente ya descuenta ${formatMoney(Math.abs(saldoAnterior))} que se le pagó de más en meses anteriores.`}
        </p>
      )}

      {/* Liquidaciones */}
      <LiquidacionesSection
        empleadaId={empleadaId}
        valorHoraLegajo={valorHoraLegajo}
        mes={mes}
        anio={anio}
        items={liquidacionesMes}
        isLoading={loadingLiq}
        prefillHaber={prefillHaber}
        onConsumePrefillHaber={onConsumePrefillHaber}
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
  label,
  value,
  bold,
  className,
}: {
  label: string
  value: number
  bold?: boolean
  className?: string
}) {
  return (
    <div className="border-border bg-surface border px-4 py-3">
      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
        {label}
      </p>
      <p className={`mt-1 text-base tabular-nums ${bold ? 'font-bold' : ''} ${className ?? ''}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}

// ── LiquidacionesSection ─────────────────────────────────────

function LiquidacionesSection({
  empleadaId,
  valorHoraLegajo,
  mes,
  anio,
  items,
  isLoading,
  prefillHaber,
  onConsumePrefillHaber,
}: {
  empleadaId: string
  valorHoraLegajo: number | null
  mes: number
  anio: number
  items: TLiquidacionEmpleada[]
  isLoading: boolean
  prefillHaber: PrefillHaber | null
  onConsumePrefillHaber: () => void
}) {
  const { isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const crear = useCrearLiquidacionEmpleada(empleadaId)
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
    // El cast es por el z.preprocess de horas/valor hora: el tipo de entrada
    // del schema no coincide con el de salida y zodResolver no lo concilia.
    resolver: zodResolver(
      liquidacionEmpleadaSchema
    ) as unknown as Resolver<TLiquidacionEmpleadaForm>,
    defaultValues: {
      empleada_id: empleadaId,
      tipo_concepto: 'HABER',
      periodo_mes: mes,
      periodo_anio: anio,
      concepto: '',
      importe: 0,
    },
  })

  const tipoConcepto = form.watch('tipo_concepto')
  const conceptos = tipoConcepto === 'HABER' ? conceptosHaber : conceptosDescuento

  // "Horas trabajadas": ella carga las horas, el importe lo calcula el sistema.
  const conceptoElegido = form.watch('concepto')
  const esPorHora = conceptoElegido === CONCEPTO_HORAS
  const horas = Number(form.watch('cantidad_horas') || 0)
  const valorHora = Number(form.watch('valor_hora') || 0)
  const importeHoras = calcularImporteHoras(horas, valorHora)

  useEffect(() => {
    if (!esPorHora) return
    // Al elegir el concepto se propone el valor hora del legajo; si lo pisa a
    // mano, ese es el que queda guardado en la liquidación de este mes.
    if (!form.getValues('valor_hora') && valorHoraLegajo) {
      form.setValue('valor_hora', valorHoraLegajo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esPorHora, valorHoraLegajo])

  useEffect(() => {
    if (!esPorHora) return
    if (form.getValues('importe') !== importeHoras) {
      form.setValue('importe', importeHoras, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esPorHora, importeHoras])

  // Viene de "Descontar puntos" en Comisiones: precarga el importe sugerido,
  // ella lo puede ajustar antes de guardar.
  useEffect(() => {
    if (!prefillHaber) return
    form.reset({
      empleada_id: empleadaId,
      tipo_concepto: 'HABER',
      periodo_mes: mes,
      periodo_anio: anio,
      concepto: 'Premio',
      importe: Math.round(prefillHaber.importe * 100) / 100,
      observaciones: `Comisión por puntaje (${prefillHaber.puntos} pts descontados)${prefillHaber.nota ? ` — ${prefillHaber.nota}` : ''}`,
    })
    setShowForm(true)
    onConsumePrefillHaber()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillHaber])

  const onSubmit = form.handleSubmit((data) => {
    // Si cambió de concepto después de tipear horas, no se arrastran valores
    // viejos: horas y valor hora solo viajan con el concepto que las usa.
    const horasFields =
      data.concepto === CONCEPTO_HORAS
        ? { cantidad_horas: data.cantidad_horas, valor_hora: data.valor_hora }
        : { cantidad_horas: undefined, valor_hora: undefined }

    crear.mutate(
      { ...data, ...horasFields, periodo_mes: mes, periodo_anio: anio },
      {
        onSuccess: (r) => {
          if (r.ok) {
            form.reset({
              empleada_id: empleadaId,
              tipo_concepto: 'HABER',
              periodo_mes: mes,
              periodo_anio: anio,
              concepto: '',
              importe: 0,
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
          Liquidación — {MESES[mes - 1]} {anio}
        </h3>
        <div className="flex gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)}>
              Importar comisiones
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar concepto
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="border-border bg-surface space-y-3 border p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo
              </label>
              <select
                {...form.register('tipo_concepto')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="HABER">Haber</option>
                <option value="DESCUENTO">Descuento</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Concepto *
              </label>
              <select
                {...form.register('concepto')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                {conceptos.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.concepto && (
                <p className="text-danger mt-1 text-[11px]">
                  {form.formState.errors.concepto.message}
                </p>
              )}
            </div>
            <Input
              label={esPorHora ? 'Importe (calculado)' : 'Importe *'}
              type="number"
              step="0.01"
              min="0"
              readOnly={esPorHora}
              {...form.register('importe', { valueAsNumber: true })}
              error={form.formState.errors.importe?.message}
            />
          </div>

          {esPorHora && (
            <div className="border-border bg-muted/20 grid grid-cols-2 gap-3 border p-3 sm:grid-cols-3">
              <Input
                label="Horas *"
                type="number"
                step="0.5"
                min="0"
                {...form.register('cantidad_horas')}
                error={form.formState.errors.cantidad_horas?.message}
              />
              <Input
                label="Valor hora *"
                type="number"
                step="0.01"
                min="0"
                {...form.register('valor_hora')}
                error={form.formState.errors.valor_hora?.message}
              />
              <div className="flex flex-col justify-end pb-2">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Total
                </span>
                <span className="text-sm font-bold tabular-nums">{formatMoney(importeHoras)}</span>
              </div>
              {!valorHoraLegajo && (
                <p className="text-muted-foreground col-span-full text-[11px]">
                  Esta empleada no tiene valor hora cargado en el legajo. Podés escribirlo acá, y si
                  lo dejás en el legajo se propone solo el mes que viene.
                </p>
              )}
            </div>
          )}

          <Input label="Observaciones" {...form.register('observaciones')} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : !items.length ? (
        <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
          Sin conceptos para este período
        </p>
      ) : (
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b-2">
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Concepto
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Tipo
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Importe
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Observaciones
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">
                    {l.concepto}
                    {l.cantidad_horas != null && l.valor_hora != null && (
                      <div className="text-muted-foreground text-[11px] font-normal">
                        {Number(l.cantidad_horas)} hs × {formatMoney(Number(l.valor_hora))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase ${l.tipo_concepto === 'HABER' ? 'text-success' : 'text-danger'}`}
                    >
                      {l.tipo_concepto === 'HABER' ? 'Haber' : 'Descuento'}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${l.tipo_concepto === 'DESCUENTO' ? 'text-danger' : ''}`}
                  >
                    {formatMoney(Number(l.importe))}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 text-xs">
                    {l.observaciones ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setDeleteId(l.id)}
                      className="text-muted-foreground hover:text-danger p-1"
                    >
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
        onConfirm={() => {
          if (deleteId) eliminar.mutate(deleteId)
          setDeleteId(null)
        }}
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
  empleadaId,
  mes,
  anio,
  items,
  isLoading,
  totalPagado,
}: {
  empleadaId: string
  mes: number
  anio: number
  items: TPagoEmpleada[]
  isLoading: boolean
  totalPagado: number
}) {
  const [showForm, setShowForm] = useState(false)
  // Cuando hay un pago en edición el mismo formulario pasa a modo editar.
  const [editando, setEditando] = useState<TPagoEmpleada | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const registrar = useRegistrarPagoEmpleada(empleadaId)
  const actualizar = useActualizarPagoEmpleada(empleadaId)
  const eliminar = useEliminarPagoEmpleada(empleadaId)

  const valoresIniciales = (): TPagoEmpleadaForm => ({
    empleada_id: empleadaId,
    periodo_mes: mes,
    periodo_anio: anio,
    tipo_pago: 'TRANSFERENCIA',
    importe: 0,
    fecha_pago: toLocalDateInputValue(),
  })

  const form = useForm<TPagoEmpleadaForm>({
    resolver: zodResolver(pagoEmpleadaSchema),
    defaultValues: valoresIniciales(),
  })

  const cerrarForm = () => {
    form.reset(valoresIniciales())
    setEditando(null)
    setShowForm(false)
  }

  const abrirEdicion = (p: TPagoEmpleada) => {
    form.reset({
      empleada_id: p.empleada_id,
      periodo_mes: p.periodo_mes,
      periodo_anio: p.periodo_anio,
      tipo_pago: p.tipo_pago,
      importe: Number(p.importe),
      fecha_pago: p.fecha_pago,
      cuenta_bancaria: p.cuenta_bancaria ?? '',
      notas: p.notas ?? '',
    })
    setEditando(p)
    setShowForm(true)
  }

  const onSubmit = form.handleSubmit((data) => {
    const payload = { ...data, periodo_mes: mes, periodo_anio: anio }
    if (editando) {
      actualizar.mutate(
        { id: editando.id, form: payload },
        { onSuccess: (r) => r.ok && cerrarForm() }
      )
      return
    }
    registrar.mutate(payload, { onSuccess: (r) => r.ok && cerrarForm() })
  })

  const guardando = registrar.isPending || actualizar.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Pagos — {MESES[mes - 1]} {anio}
          {totalPagado > 0 && (
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              Total: {formatMoney(totalPagado)}
            </span>
          )}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => (showForm ? cerrarForm() : setShowForm(true))}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Registrar pago
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="border-border bg-surface space-y-3 border p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo *
              </label>
              <select
                {...form.register('tipo_pago')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
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
            <Button type="submit" size="sm" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={cerrarForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : !items.length ? (
        <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
          Sin pagos registrados para este período
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
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Importe
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Notas
                </th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 tabular-nums">{formatDate(p.fecha_pago)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                      {p.tipo_pago}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatMoney(Number(p.importe))}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 text-xs">{p.notas ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEdicion(p)}
                        aria-label="Editar pago"
                        className="text-muted-foreground hover:text-primary p-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(p.id)}
                        aria-label="Eliminar pago"
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar pago"
        description="Se eliminará el pago y el egreso que generó en Fondos. No se puede deshacer."
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

// ── CuentaSection ─────────────────────────────────────────────

const cuentaSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type TCuentaForm = z.infer<typeof cuentaSchema>

function CuentaSection({ empleada }: { empleada: TEmpleada }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: usuario, isLoading: loadingUsuario } = useQuery({
    queryKey: ['usuario', empleada.usuario_id],
    queryFn: async () => {
      if (!empleada.usuario_id) return null
      const { data } = await supabase
        .from('usuarios')
        .select('email, nombre, activo')
        .eq('id', empleada.usuario_id)
        .single()
      return data
    },
    enabled: !!empleada.usuario_id,
  })

  const crear = useMutation({
    mutationFn: async (data: TCuentaForm) => {
      const res = await fetch('/api/admin/crear-usuario-empleada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleada_id: empleada.id, ...data }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      return json as { ok: true; email: string }
    },
    onSuccess: () => {
      toast.success('Cuenta creada correctamente')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['empleada', empleada.id] })
      qc.invalidateQueries({ queryKey: ['empleadas'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const form = useForm<TCuentaForm>({
    resolver: zodResolver(cuentaSchema),
    defaultValues: { email: '', password: '' },
  })

  const tieneCuenta = !!empleada.usuario_id

  return (
    <div className="max-w-md space-y-5">
      <div>
        <p className="text-muted-foreground mb-3 text-[10px] font-bold tracking-widest uppercase">
          Acceso al sistema
        </p>

        {loadingUsuario ? (
          <Skeleton className="h-12 w-full rounded-none" />
        ) : tieneCuenta ? (
          <div className="border-success/30 bg-success/5 flex items-start gap-3 border px-4 py-3">
            <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-success text-sm font-medium">Cuenta activa</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{usuario?.email ?? '—'}</p>
            </div>
          </div>
        ) : (
          <div className="border-border bg-muted/20 flex items-start gap-3 border px-4 py-3">
            <KeyRound className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Sin cuenta de acceso</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Esta empleada todavía no puede ingresar al sistema.
              </p>
            </div>
          </div>
        )}
      </div>

      {!tieneCuenta && !showForm && (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Crear cuenta de acceso
        </Button>
      )}

      {!tieneCuenta && showForm && (
        <form
          onSubmit={form.handleSubmit((data) => crear.mutate(data))}
          className="border-border bg-surface space-y-3 border p-4"
        >
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Nueva cuenta — {empleada.nombre}
          </p>
          <Input
            label="Email *"
            type="email"
            autoComplete="off"
            disabled={crear.isPending}
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Input
            label="Contraseña *"
            type="password"
            autoComplete="new-password"
            disabled={crear.isPending}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <p className="text-muted-foreground text-[11px]">
            Comunicá estas credenciales a la empleada de forma directa.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={crear.isPending}>
              {crear.isPending ? 'Creando...' : 'Crear cuenta'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={crear.isPending}
              onClick={() => {
                setShowForm(false)
                form.reset()
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
