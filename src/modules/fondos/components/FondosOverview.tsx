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
  useAjustarSaldoFondos,
} from '../hooks/useFondos'
import {
  ajusteSaldoFondosSchema,
  esCambioDeMoneda,
  fondoMovimientoSchema,
  transferenciaFondosSchema,
  type TAjusteSaldoFondosForm,
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
import { Plus, Trash2, ArrowLeftRight, X, Pencil } from 'lucide-react'
import type { TCuentaFondos, TFondoMovimiento } from '../types'
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

// Una columna por cuenta, en el mismo orden que las tarjetas de saldo.
// Se declaran acá (y no sueltas en el <table>) porque la tabla esconde
// las que están en cero: con nueve columnas fijas, Dólares y Tarallo se
// caían fuera del borde derecho y Paola no las encontraba nunca.
const COLUMNAS_IMPORTE: {
  cuenta: TCuentaFondos
  label: string
  get: (m: TFondoMovimiento) => number
  moneda: 'ARS' | 'USD'
}[] = [
  { cuenta: 'banco', label: 'Banco', get: (m) => m.importe_banco, moneda: 'ARS' },
  {
    cuenta: 'cheques_cartera',
    label: 'Cheques cartera',
    get: (m) => m.importe_cheques_cartera,
    moneda: 'ARS',
  },
  { cuenta: 'efectivo', label: 'Efectivo', get: (m) => m.importe_efectivo, moneda: 'ARS' },
  { cuenta: 'usd', label: 'Dólares', get: (m) => m.importe_usd, moneda: 'USD' },
  { cuenta: 'taralo', label: 'Tarallo', get: (m) => m.importe_taralo, moneda: 'ARS' },
]

const CUENTAS_TRANSFERIBLES: { value: TTransferenciaFondosForm['origen']; label: string }[] = [
  { value: 'banco', label: 'Banco' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'usd', label: 'Dólares' },
  { value: 'taralo', label: 'Tarallo' },
]

function etiquetaCuenta(cuenta: string): string {
  return CUENTAS_TRANSFERIBLES.find((c) => c.value === cuenta)?.label ?? cuenta
}

const PAGE_SIZE = 25

export function FondosOverview() {
  const { data: saldo, isLoading: loadingSaldo } = useSaldoFondos()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cuenta, setCuenta] = useState<TCuentaFondos | null>(null)
  const [page, setPage] = useState(0)
  const {
    data: movsData,
    isLoading: loadingMovs,
    error,
  } = useMovimientosFondos({
    desde: desde || undefined,
    hasta: hasta || undefined,
    cuenta: cuenta ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const movs = movsData?.rows
  const registrar = useRegistrarMovimiento()
  const eliminar = useEliminarMovimiento()
  const transferir = useTransferirFondos()
  const ajustar = useAjustarSaldoFondos()
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
  // Qué tarjeta se está ajustando. Guarda el saldo que mostraba al
  // abrir para poder anticipar la diferencia sin volver a la DB.
  const [ajuste, setAjuste] = useState<{
    cuenta: TAjusteSaldoFondosForm['cuenta']
    label: string
    moneda: 'ARS' | 'USD'
    saldoActual: number
  } | null>(null)

  const cuentaActiva = COLUMNAS_IMPORTE.find((c) => c.cuenta === cuenta) ?? null

  // Solo las cuentas que alguna fila de esta página movió. Si no queda
  // ninguna (movimientos que un cheque rechazado dejó en cero) se
  // muestran todas, para no dejar la tabla sin columnas de importe.
  const conMovimiento = COLUMNAS_IMPORTE.filter((col) =>
    (movs ?? []).some((m) => Number(col.get(m)) > 0)
  )
  const columnasImporte = conMovimiento.length ? conMovimiento : COLUMNAS_IMPORTE

  const ajusteForm = useForm<TAjusteSaldoFondosForm>({
    resolver: zodResolver(ajusteSaldoFondosSchema) as unknown as Resolver<TAjusteSaldoFondosForm>,
    defaultValues: {
      cuenta: 'efectivo',
      saldo_real: 0,
      fecha: toLocalDateInputValue(),
      notas: '',
    },
  })

  // Arranca con el saldo que calculó el sistema para que ella edite
  // ese número: así ve de dónde parte y qué tanto lo está corriendo.
  function abrirAjuste(
    cuenta: TAjusteSaldoFondosForm['cuenta'],
    label: string,
    moneda: 'ARS' | 'USD',
    saldoActual: number
  ) {
    setAjuste({ cuenta, label, moneda, saldoActual })
    ajusteForm.reset({
      cuenta,
      saldo_real: saldoActual,
      fecha: toLocalDateInputValue(),
      notas: '',
    })
  }

  const saldoRealTipeado = Number(ajusteForm.watch('saldo_real'))
  const diferenciaAjuste =
    ajuste && Number.isFinite(saldoRealTipeado)
      ? Math.round((saldoRealTipeado - ajuste.saldoActual) * 100) / 100
      : 0

  const handleAjustar = ajusteForm.handleSubmit((data) => {
    ajustar.mutate(data, {
      onSuccess: (r) => {
        if (r.ok) {
          ajusteForm.reset()
          setAjuste(null)
        }
      },
    })
  })

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

  // Comprar o vender dólares mueve importes distintos de cada lado, así
  // que el formulario pregunta cuánto entra y calcula la cotización en
  // vivo para que se pueda controlar antes de guardar. Entre cuentas en
  // pesos ni se pregunta: entra lo mismo que sale.
  const origenTransfer = transferForm.watch('origen')
  const destinoTransfer = transferForm.watch('destino')
  const importeSale = Number(transferForm.watch('importe')) || 0
  const importeEntra = Number(transferForm.watch('importe_destino')) || 0
  const cambioDeMoneda = esCambioDeMoneda(origenTransfer, destinoTransfer)
  const pesosPorDolar =
    cambioDeMoneda && importeSale > 0 && importeEntra > 0
      ? origenTransfer === 'usd'
        ? importeEntra / importeSale
        : importeSale / importeEntra
      : null

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
            {(
              [
                { cuenta: 'banco', label: 'Banco', value: saldo.saldo_banco, moneda: 'ARS' },
                {
                  cuenta: 'cheques_cartera',
                  label: 'Cheques en cartera',
                  value: saldo.saldo_cheques_cartera,
                  moneda: 'ARS',
                },
                {
                  cuenta: 'efectivo',
                  label: 'Efectivo',
                  value: saldo.saldo_efectivo,
                  moneda: 'ARS',
                },
                { cuenta: 'usd', label: 'Dólares', value: saldo.saldo_usd, moneda: 'USD' },
                { cuenta: 'taralo', label: 'Tarallo', value: saldo.saldo_taralo, moneda: 'ARS' },
              ] as const
            ).map(({ cuenta: c, label, value, moneda }) => {
              const activa = cuenta === c
              // Cheques en cartera no se ajusta: ese saldo es la suma de
              // los cheques EN_CARTERA, y corregirlo a mano lo dejaría sin
              // corresponder con ningún cheque de la lista de abajo.
              const ajustable = c !== 'cheques_cartera'
              return (
                <div
                  key={label}
                  className={`flex flex-col border transition-colors ${
                    activa
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-foreground'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCuenta(activa ? null : c)
                      setPage(0)
                    }}
                    title={activa ? 'Ver todos los movimientos' : `Ver los movimientos de ${label}`}
                    className="flex-1 px-4 pt-4 pb-2 text-left"
                  >
                    <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                      {label}
                    </p>
                    <p
                      className={`mt-1 text-xl font-bold tabular-nums ${value < 0 ? 'text-danger' : ''}`}
                    >
                      {formatMoney(value, moneda)}
                    </p>
                  </button>
                  {isAdmin && ajustable && (
                    <button
                      type="button"
                      onClick={() => abrirAjuste(c, label, moneda, value)}
                      title={`Corregir a mano el saldo de ${label}`}
                      className="text-muted-foreground hover:text-primary flex items-center gap-1 px-4 pb-3 text-[10px] font-bold tracking-widest uppercase"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      Ajustar balance
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {ajuste && (
        <form onSubmit={handleAjustar} className="border-primary space-y-3 border p-4">
          <div>
            <p className="text-sm font-medium">Ajustar el balance de {ajuste.label}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              El saldo lo calcula el sistema sumando los movimientos cargados. Si no coincide con lo
              que tenés de verdad, cargá el saldo real: la diferencia queda registrada como un
              movimiento más, con tu nota.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
                Según el sistema
              </p>
              <p className="border-border bg-muted/30 border px-3 py-2 text-sm tabular-nums">
                {formatMoney(ajuste.saldoActual, ajuste.moneda)}
              </p>
            </div>
            <Input
              label="Saldo real *"
              type="number"
              step="0.01"
              {...ajusteForm.register('saldo_real', { valueAsNumber: true })}
              error={ajusteForm.formState.errors.saldo_real?.message}
            />
            <Input
              label="Fecha *"
              type="date"
              {...ajusteForm.register('fecha')}
              error={ajusteForm.formState.errors.fecha?.message}
            />
          </div>
          {/* Anticipa el movimiento que se va a crear, para que el
              ajuste no sea un número que aparece de la nada. */}
          {diferenciaAjuste !== 0 && (
            <p className="text-muted-foreground text-xs">
              Se va a registrar un{' '}
              <span
                className={`font-bold tracking-widest uppercase ${
                  diferenciaAjuste > 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {diferenciaAjuste > 0 ? 'Ingreso' : 'Egreso'}
              </span>{' '}
              de{' '}
              <span className="font-semibold tabular-nums">
                {formatMoney(Math.abs(diferenciaAjuste), ajuste.moneda)}
              </span>{' '}
              en {ajuste.label}.
            </p>
          )}
          <Textarea
            label="Nota *"
            placeholder="Ej: se ajusta el balance porque no cargué el saldo inicial y hoy tengo US$ 800"
            {...ajusteForm.register('notas')}
            error={ajusteForm.formState.errors.notas?.message}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={ajustar.isPending}>
              {ajustar.isPending ? 'Guardando...' : 'Ajustar balance'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAjuste(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Movimientos</h3>
          {cuentaActiva && (
            <button
              type="button"
              onClick={() => {
                setCuenta(null)
                setPage(0)
              }}
              className="border-primary text-primary bg-primary/10 inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold"
            >
              Solo {cuentaActiva.label}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input
              label={cambioDeMoneda ? `Sale de ${etiquetaCuenta(origenTransfer)} *` : 'Importe *'}
              type="number"
              step="0.01"
              min="0.01"
              {...transferForm.register('importe', { valueAsNumber: true })}
              error={transferForm.formState.errors.importe?.message}
            />
            {cambioDeMoneda && (
              <Input
                label={`Entra en ${etiquetaCuenta(destinoTransfer)} *`}
                type="number"
                step="0.01"
                min="0.01"
                {...transferForm.register('importe_destino', { valueAsNumber: true })}
                error={transferForm.formState.errors.importe_destino?.message}
              />
            )}
            <Input label="Fecha *" type="date" {...transferForm.register('fecha')} />
          </div>
          {cambioDeMoneda && (
            <p className="text-muted-foreground text-[11px] leading-snug">
              {pesosPorDolar
                ? `Cotización: US$ 1 = ${formatMoney(pesosPorDolar)}.`
                : 'Cargá los dos importes y te muestro a cuánto quedó el dólar.'}
            </p>
          )}
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
              label="Dólares US$"
              type="number"
              step="0.01"
              min="0"
              {...form.register('importe_usd', { valueAsNumber: true })}
            />
            <Input
              label="Tarallo $"
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
          {cuentaActiva
            ? `Sin movimientos de ${cuentaActiva.label}`
            : 'Sin movimientos registrados'}
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
                {columnasImporte.map((col) => (
                  <th
                    key={col.cuenta}
                    className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase"
                  >
                    {col.label}
                  </th>
                ))}
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
                  {columnasImporte.map((col) => {
                    const importe = Number(col.get(m))
                    return (
                      <td key={col.cuenta} className="px-4 py-2.5 text-right tabular-nums">
                        {importe > 0 ? formatMoney(importe, col.moneda) : '—'}
                      </td>
                    )
                  })}
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
