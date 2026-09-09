'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCheques,
  useActualizarEstadoCheque,
  useConfirmarAcreditacionCheque,
  useDesmarcarAcreditacionCheque,
  useEndosarChequeAProveedor,
  useCrearChequeManual,
} from '../hooks/useFondos'
import { chequeManualSchema, type TChequeManualForm } from '../schemas/fondoSchema'
import { useProveedores, useComprasProveedores } from '@/modules/proveedores/hooks/useProveedores'
import { useClientes } from '@/modules/clientes/hooks/useClientes'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PaginationControls } from '@/shared/components/PaginationControls'
import type { TCheque } from '@/modules/cobranzas/types'
import {
  Check,
  X,
  Clock3,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  CircleDashed,
  Plus,
} from 'lucide-react'

const ESTADO_LABEL_COMPRA: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIALMENTE_PAGADA: 'Parcial',
}

const PAGE_SIZE = 25

type TEstadoFiltro = TCheque['estado'] | 'TODOS'

const ESTADO_LABEL: Record<TCheque['estado'], string> = {
  EN_CARTERA: 'En cartera',
  DEPOSITADO: 'Depositado',
  ENDOSADO: 'Endosado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
}

const TODOS_LOS_ESTADOS: TCheque['estado'][] = [
  'EN_CARTERA',
  'DEPOSITADO',
  'ENDOSADO',
  'RECHAZADO',
  'ANULADO',
]

export function ChequesTable() {
  const [filtro, setFiltro] = useState<TEstadoFiltro>('EN_CARTERA')
  const [accionId, setAccionId] = useState<string | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<TCheque['estado'] | ''>('')
  const [fechaCobro, setFechaCobro] = useState('')
  const [page, setPage] = useState(0)
  const [showNuevoCheque, setShowNuevoCheque] = useState(false)

  const opts = {
    ...(filtro === 'TODOS' ? {} : { estado: filtro as TCheque['estado'] }),
    page,
    pageSize: PAGE_SIZE,
  }
  const { data: chequesData, isLoading, error } = useCheques(opts)
  const data = chequesData?.rows
  const actualizar = useActualizarEstadoCheque()
  const confirmarAcreditacion = useConfirmarAcreditacionCheque()
  const desmarcarAcreditacion = useDesmarcarAcreditacionCheque()

  const accionCheque = data?.find((c) => c.id === accionId) ?? null
  const opcionesEstado = TODOS_LOS_ESTADOS.filter(
    (e) => e !== accionCheque?.estado && (e !== 'ENDOSADO' || accionCheque?.tipo === 'TERCERO')
  )

  const FILTROS: { value: TEstadoFiltro; label: string }[] = [
    { value: 'EN_CARTERA', label: 'En cartera' },
    { value: 'DEPOSITADO', label: 'Depositados' },
    { value: 'ENDOSADO', label: 'Endosados' },
    { value: 'RECHAZADO', label: 'Rechazados' },
    { value: 'TODOS', label: 'Todos' },
  ]

  const handleConfirmarAccion = () => {
    if (!accionId || !nuevoEstado) return
    actualizar.mutate(
      { id: accionId, estado: nuevoEstado, fecha_cobro: fechaCobro || undefined },
      {
        onSuccess: (r) => {
          if (r.ok) {
            setAccionId(null)
            setNuevoEstado('')
            setFechaCobro('')
          }
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros de estado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFiltro(f.value)
                setPage(0)
              }}
              className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filtro === f.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowNuevoCheque((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo cheque
        </Button>
      </div>

      {showNuevoCheque && (
        <NuevoChequeForm
          onDone={() => setShowNuevoCheque(false)}
          onCancel={() => setShowNuevoCheque(false)}
        />
      )}

      {/* Modal acción */}
      {accionId && (
        <div className="border-border bg-surface space-y-3 border p-4">
          <p className="text-sm font-medium">Cambiar estado del cheque</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Nuevo estado
              </label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as TCheque['estado'])}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                {opcionesEstado.map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_LABEL[e]}
                  </option>
                ))}
              </select>
            </div>
            {nuevoEstado === 'DEPOSITADO' && (
              <div>
                <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                  Fecha depósito
                </label>
                <input
                  type="date"
                  value={fechaCobro}
                  onChange={(e) => setFechaCobro(e.target.value)}
                  className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                />
              </div>
            )}
          </div>

          {nuevoEstado === 'ENDOSADO' && accionCheque ? (
            <EndosarChequeForm
              cheque={accionCheque}
              onDone={() => {
                setAccionId(null)
                setNuevoEstado('')
                setFechaCobro('')
              }}
              onCancel={() => {
                setAccionId(null)
                setNuevoEstado('')
                setFechaCobro('')
              }}
            />
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirmarAccion}
                disabled={!nuevoEstado || actualizar.isPending}
              >
                {actualizar.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAccionId(null)
                  setNuevoEstado('')
                  setFechaCobro('')
                }}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin cheques
        </p>
      ) : (
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b-2">
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  N°
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Banco
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Importe
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  F. Cobro
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Estado
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Tipo
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-center text-[10px] font-bold tracking-[0.14em] uppercase">
                  Acreditado
                </th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {data.map((ch) => (
                <tr key={ch.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{ch.numero}</td>
                  <td className="px-4 py-2.5">{ch.banco}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatMoney(Number(ch.importe))}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                    {ch.fecha_cobro ? formatDate(ch.fecha_cobro) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <EstadoBadge estado={ch.estado} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                      {ch.tipo === 'PROPIO' ? 'Propio' : 'Tercero'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <AcreditacionToggle
                      cheque={ch}
                      isPending={confirmarAcreditacion.isPending || desmarcarAcreditacion.isPending}
                      onConfirmar={() => confirmarAcreditacion.mutate(ch.id)}
                      onDesmarcar={() => desmarcarAcreditacion.mutate(ch.id)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setAccionId(ch.id)}
                      className="text-primary text-xs hover:underline"
                    >
                      Cambiar estado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            total={chequesData?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}

const ESTADOS_CONFIRMABLES: TCheque['estado'][] = ['DEPOSITADO', 'ENDOSADO', 'RECHAZADO']

function AcreditacionToggle({
  cheque,
  isPending,
  onConfirmar,
  onDesmarcar,
}: {
  cheque: TCheque
  isPending: boolean
  onConfirmar: () => void
  onDesmarcar: () => void
}) {
  if (!ESTADOS_CONFIRMABLES.includes(cheque.estado)) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  if (cheque.acreditacion_confirmada) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={onDesmarcar}
        title="Acreditación confirmada — click para desmarcar"
        className="text-success inline-flex items-center justify-center disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onConfirmar}
      title="Sin confirmar — click para marcar como acreditado"
      className="text-danger inline-flex items-center justify-center disabled:opacity-50"
    >
      <CircleDashed className="h-4 w-4" />
    </button>
  )
}

const ESTADO_ICON: Record<TCheque['estado'], typeof Check> = {
  EN_CARTERA: Clock3,
  DEPOSITADO: Check,
  ENDOSADO: ArrowRightLeft,
  RECHAZADO: X,
  ANULADO: Ban,
}

function EstadoBadge({ estado }: { estado: TCheque['estado'] }) {
  const colors: Record<TCheque['estado'], string> = {
    EN_CARTERA: 'text-warning border-warning/40 bg-warning/10',
    DEPOSITADO: 'text-success border-success/40 bg-success/10',
    ENDOSADO: 'text-primary border-primary/40 bg-primary/10',
    RECHAZADO: 'text-danger border-danger/40 bg-danger/10',
    ANULADO: 'text-muted-foreground border-border bg-muted/20',
  }
  const Icon = ESTADO_ICON[estado]
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${colors[estado]}`}
    >
      <Icon className="h-3 w-3" />
      {ESTADO_LABEL[estado]}
    </span>
  )
}

// Endosar = entregarle este cheque de tercero a un proveedor para saldar
// una compra suya, en vez de emitirle un cheque propio.
function EndosarChequeForm({
  cheque,
  onDone,
  onCancel,
}: {
  cheque: TCheque
  onDone: () => void
  onCancel: () => void
}) {
  const [proveedorId, setProveedorId] = useState('')
  const [compraId, setCompraId] = useState('')
  const [importe, setImporte] = useState(String(cheque.importe))
  const [fechaPago, setFechaPago] = useState(toLocalDateInputValue())
  const [notas, setNotas] = useState('')

  const { data: proveedores = [] } = useProveedores()
  const { data: comprasData } = useComprasProveedores(
    { proveedorId, pageSize: 100 },
    { enabled: !!proveedorId }
  )
  const comprasPendientes = (comprasData?.rows ?? []).filter((c) =>
    ['PENDIENTE', 'PARCIALMENTE_PAGADA'].includes(c.estado)
  )
  const endosar = useEndosarChequeAProveedor()

  const importeNum = Number(importe)
  const importeValido = importeNum > 0 && importeNum <= cheque.importe

  const handleSubmit = () => {
    if (!compraId || !importeValido) return
    endosar.mutate(
      { chequeId: cheque.id, compraId, importe: importeNum, fechaPago, notas: notas || undefined },
      { onSuccess: (r) => r.ok && onDone() }
    )
  }

  return (
    <div className="border-border space-y-3 border-t pt-3">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        Endosar cheque de {formatMoney(cheque.importe)} a un proveedor
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
            Proveedor *
          </label>
          <select
            value={proveedorId}
            onChange={(e) => {
              setProveedorId(e.target.value)
              setCompraId('')
            }}
            className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          >
            <option value="">Seleccionar...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
            Compra a pagar *
          </label>
          <select
            value={compraId}
            onChange={(e) => setCompraId(e.target.value)}
            disabled={!proveedorId}
            className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
          >
            <option value="">Seleccionar...</option>
            {comprasPendientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.concepto} — {formatMoney(c.importe_total)} ({ESTADO_LABEL_COMPRA[c.estado]})
              </option>
            ))}
          </select>
          {proveedorId && !comprasPendientes.length && (
            <p className="text-muted-foreground mt-1 text-[11px]">
              Este proveedor no tiene facturas impagas. Cargá la factura en Proveedores &gt; Nuevo
              gasto y, en Medio de pago, elegí &quot;Todavía no lo pagué&quot; para poder endosarle
              el cheque acá.
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Importe a aplicar *"
          type="number"
          step="0.01"
          min="0.01"
          max={cheque.importe}
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          error={
            !importeValido
              ? `Debe ser mayor a 0 y no superar ${formatMoney(cheque.importe)}`
              : undefined
          }
        />
        <Input
          label="Fecha *"
          type="date"
          value={fechaPago}
          onChange={(e) => setFechaPago(e.target.value)}
        />
      </div>
      <Input label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={endosar.isPending || !compraId || !importeValido}
        >
          {endosar.isPending ? 'Guardando...' : 'Confirmar endoso'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// Cargar un cheque que Paola ya tiene en mano por fuera de un recibo o un
// pago a proveedor (ej: saldos iniciales del Excel, o un cheque recibido
// sin pasar por un recibo formal).
function NuevoChequeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { data: clientes = [] } = useClientes()
  const { data: proveedores = [] } = useProveedores()
  const crear = useCrearChequeManual()

  const form = useForm<TChequeManualForm>({
    resolver: zodResolver(chequeManualSchema) as unknown as Resolver<TChequeManualForm>,
    defaultValues: {
      tipo: 'TERCERO',
      numero: '',
      banco: '',
      importe: 0,
      fecha_emision: toLocalDateInputValue(),
    },
  })

  const tipo = form.watch('tipo')

  const onSubmit = form.handleSubmit((data) => {
    crear.mutate(data, { onSuccess: (r) => r.ok && onDone() })
  })

  return (
    <form onSubmit={onSubmit} className="border-border bg-surface space-y-3 border p-4">
      <p className="text-sm font-medium">Cargar cheque</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
            Tipo *
          </label>
          <select
            {...form.register('tipo')}
            className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          >
            <option value="TERCERO">De tercero (lo recibió de un cliente)</option>
            <option value="PROPIO">Propio (emitido a un proveedor)</option>
          </select>
        </div>
        {tipo === 'TERCERO' ? (
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Cliente *
            </label>
            <select
              {...form.register('cliente_id')}
              className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {form.formState.errors.cliente_id && (
              <p className="text-danger mt-1 text-[11px]">
                {form.formState.errors.cliente_id.message}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Proveedor *
            </label>
            <select
              {...form.register('proveedor_id')}
              className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {proveedores?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {form.formState.errors.proveedor_id && (
              <p className="text-danger mt-1 text-[11px]">
                {form.formState.errors.proveedor_id.message}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="N° Cheque *"
          {...form.register('numero')}
          error={form.formState.errors.numero?.message}
        />
        <Input
          label="Banco *"
          {...form.register('banco')}
          error={form.formState.errors.banco?.message}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Importe *"
          type="number"
          step="0.01"
          min="0.01"
          {...form.register('importe', { valueAsNumber: true })}
          error={form.formState.errors.importe?.message}
        />
        <Input
          label="Fecha emisión *"
          type="date"
          {...form.register('fecha_emision')}
          error={form.formState.errors.fecha_emision?.message}
        />
      </div>
      <Input label="Fecha de cobro (opcional)" type="date" {...form.register('fecha_cobro')} />
      <Input label="Notas (opcional)" {...form.register('notas')} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar cheque'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
