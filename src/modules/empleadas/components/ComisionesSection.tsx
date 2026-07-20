'use client'

import { type ReactNode, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  useComisionConfig,
  useSaveComisionConfig,
  usePuntajePeriodo,
  useSaldoPuntaje,
  useAgregarPuntaje,
  useEliminarPuntaje,
  usePreviewPuntaje,
  useConfirmarComisionPuntaje,
  useComisionesRegistradas,
  useHorasPeriodo,
  useAgregarHoras,
  useEliminarHoras,
  useCalcularHoras,
  useCalcularProduccion,
  useTrabajosRealizados,
} from '../hooks/useEmpleadas'
import {
  comisionConfigSchema,
  registroPuntajeSchema,
  registroHorasSchema,
  type TComisionConfigForm,
  type TRegistroPuntajeForm,
  type TRegistroHorasForm,
} from '../schemas/empleadaSchema'
import type { TEmpleada, TTipoComision } from '../types'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Plus, Trash2, Settings } from 'lucide-react'

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

interface Props {
  empleada: TEmpleada
}

export function ComisionesSection({ empleada }: Props) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [showConfig, setShowConfig] = useState(false)

  const ANIOS = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - i)

  const tipoComision = empleada.tipo_comision ?? 'NINGUNA'

  return (
    <div className="space-y-6">
      {/* Período selector */}
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
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 text-xs transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar comisión
        </button>
      </div>

      {/* Config de comisión */}
      {showConfig && (
        <ComisionConfigForm
          empleada={empleada}
          tipoComision={tipoComision}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Contenido por tipo */}
      {tipoComision === 'NINGUNA' && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Esta empleada no tiene un esquema de comisión asignado.
          <br />
          <span className="text-xs">Editá el legajo para configurar el tipo de comisión.</span>
        </p>
      )}

      {tipoComision === 'PRODUCCION' && (
        <ComisionProduccionPanel empleadaId={empleada.id} mes={mes} anio={anio} />
      )}

      {tipoComision === 'PUNTAJE' && (
        <ComisionPuntajePanel empleadaId={empleada.id} mes={mes} anio={anio} />
      )}

      {tipoComision === 'HORAS' && (
        <ComisionHorasPanel empleadaId={empleada.id} mes={mes} anio={anio} />
      )}
    </div>
  )
}

// ── Config form ───────────────────────────────────────────────

function ComisionConfigForm({
  empleada,
  tipoComision,
  onClose,
}: {
  empleada: TEmpleada
  tipoComision: TTipoComision
  onClose: () => void
}) {
  const { data: config } = useComisionConfig(empleada.id)
  const guardar = useSaveComisionConfig(empleada.id)

  const esPuntaje = tipoComision === 'PUNTAJE'

  const form = useForm<TComisionConfigForm>({
    resolver: zodResolver(comisionConfigSchema) as unknown as Resolver<TComisionConfigForm>,
    defaultValues: {
      empleada_id: empleada.id,
      tipo_calculo:
        config?.tipo_calculo ?? (tipoComision === 'HORAS' ? 'VALOR_HORA' : 'MONTO_FIJO'),
      valor: esPuntaje ? 0 : (config?.valor ?? 0),
      umbral_puntaje: config?.umbral_puntaje ?? undefined,
      vigente_desde: toLocalDateInputValue(),
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const payload = esPuntaje ? { ...data, valor: 0, tipo_calculo: 'MONTO_FIJO' as const } : data
    const r = await guardar.mutateAsync(payload)
    if (r.ok) onClose()
  })

  const getTipoCalculoOptions = () => {
    if (tipoComision === 'HORAS') return [{ value: 'VALOR_HORA', label: 'Valor por hora' }]
    return [
      { value: 'MONTO_FIJO', label: 'Monto fijo' },
      { value: 'PORCENTAJE', label: 'Porcentaje' },
    ]
  }

  const getValorLabel = () => {
    if (tipoComision === 'HORAS') return 'Valor por hora *'
    const tipo = form.watch('tipo_calculo')
    return tipo === 'PORCENTAJE' ? 'Porcentaje (%) *' : 'Monto fijo ($) *'
  }

  if (tipoComision === 'NINGUNA') return null

  return (
    <form onSubmit={onSubmit} className="border-primary/30 bg-primary/5 space-y-3 border p-4">
      <p className="text-primary text-xs font-semibold">
        Configuración vigente desde hoy
        {config && !esPuntaje && (
          <span className="text-muted-foreground ml-2 font-normal">
            (actual:{' '}
            {config.tipo_calculo === 'PORCENTAJE' ? `${config.valor}%` : formatMoney(config.valor)})
          </span>
        )}
        {config && esPuntaje && config.umbral_puntaje && (
          <span className="text-muted-foreground ml-2 font-normal">
            (umbral actual: {config.umbral_puntaje} pts)
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {!esPuntaje && tipoComision !== 'HORAS' && (
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Cálculo *
            </label>
            <select
              {...form.register('tipo_calculo')}
              className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              {getTipoCalculoOptions().map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {!esPuntaje && (
          <Input
            label={getValorLabel()}
            type="number"
            step="0.01"
            min="0.01"
            {...form.register('valor')}
            error={form.formState.errors.valor?.message}
          />
        )}
        {tipoComision === 'PUNTAJE' && (
          <Input
            label="Umbral de puntos *"
            type="number"
            step="0.5"
            min="0.5"
            placeholder="ej: 15.5"
            {...form.register('umbral_puntaje')}
            error={form.formState.errors.umbral_puntaje?.message}
          />
        )}
        <Input
          label="Vigente desde *"
          type="date"
          {...form.register('vigente_desde')}
          error={form.formState.errors.vigente_desde?.message}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando...' : 'Guardar configuración'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// ── Panel: Producción ─────────────────────────────────────────

function ComisionProduccionPanel({
  empleadaId,
  mes,
  anio,
}: {
  empleadaId: string
  mes: number
  anio: number
}) {
  const { data: trabajos = [], isLoading } = useTrabajosRealizados(anio, mes, empleadaId)
  const { data: comision } = useCalcularProduccion(empleadaId, mes, anio)
  const { data: config } = useComisionConfig(empleadaId)

  const trabajosConComision = trabajos.filter((t) => t.genera_comision && t.aprobado_at)
  const totalBase = trabajosConComision.reduce((s, t) => s + Number(t.importe_comision ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total trabajos" value={formatMoney(totalBase)} />
        <SummaryCard
          label={
            config?.tipo_calculo === 'PORCENTAJE'
              ? `Comisión (${config.valor}%)`
              : 'Comisión (fijo)'
          }
          value={formatMoney(comision ?? 0)}
          highlight
        />
        <SummaryCard label="Trabajos con comisión" value={`${trabajosConComision.length}`} />
      </div>

      <div>
        <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
          Trabajos aprobados con comisión — {MESES[mes - 1]} {anio}
        </h4>
        {isLoading ? (
          <Skeletons />
        ) : !trabajosConComision.length ? (
          <Empty text="Sin trabajos con comisión aprobados para este período" />
        ) : (
          <div className="border-border overflow-x-auto border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b-2">
                  <Th>Fecha</Th>
                  <Th>Tipo</Th>
                  <Th>Cliente</Th>
                  <Th align="right">Importe comisión</Th>
                </tr>
              </thead>
              <tbody className="divide-border bg-surface divide-y">
                {trabajosConComision.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-sm tabular-nums">{formatDate(t.fecha)}</td>
                    <td className="px-4 py-2.5 text-sm">{t.tipo_trabajo}</td>
                    <td className="text-muted-foreground px-4 py-2.5 text-sm">
                      {t.clientes?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatMoney(Number(t.importe_comision ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(comision ?? 0) > 0 && (
        <p className="text-muted-foreground text-xs">
          Para agregar la comisión a la liquidación, usá el botón &quot;Agregar concepto&quot; en la
          solapa Liquidación.
        </p>
      )}
    </div>
  )
}

// ── Panel: Puntaje ────────────────────────────────────────────

function ComisionPuntajePanel({
  empleadaId,
  mes,
  anio,
}: {
  empleadaId: string
  mes: number
  anio: number
}) {
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: registros = [], isLoading } = usePuntajePeriodo(empleadaId, mes, anio)
  const { data: saldo } = useSaldoPuntaje(empleadaId)
  const { data: preview } = usePreviewPuntaje(empleadaId, mes, anio)
  const { data: tiposParam = [] } = useParametros({ categorias: ['TIPO_SERVICIO'] })
  const { data: comisionesRegistradas = [] } = useComisionesRegistradas(empleadaId)
  const agregar = useAgregarPuntaje(empleadaId, mes, anio)
  const eliminar = useEliminarPuntaje(empleadaId, mes, anio)
  const confirmar = useConfirmarComisionPuntaje(empleadaId, mes, anio)

  const comisionDelPeriodo = comisionesRegistradas.find(
    (c) => c.periodo_mes === mes && c.periodo_anio === anio
  )

  const form = useForm<TRegistroPuntajeForm>({
    resolver: zodResolver(registroPuntajeSchema) as unknown as Resolver<TRegistroPuntajeForm>,
    defaultValues: {
      empleada_id: empleadaId,
      periodo_mes: mes,
      periodo_anio: anio,
      descripcion: '',
      puntos: 0,
      tipo_trabajo: null,
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const r = await agregar.mutateAsync({ ...data, periodo_mes: mes, periodo_anio: anio })
    if (r.ok) {
      form.reset({
        empleada_id: empleadaId,
        periodo_mes: mes,
        periodo_anio: anio,
        descripcion: '',
        puntos: 0,
        tipo_trabajo: null,
      })
      setShowForm(false)
    }
  })

  const totalPeriodo = registros.reduce((s, r) => s + Number(r.puntos), 0)
  const puntosAcum = saldo?.puntos_acumulados ?? 0
  const totalCalculado = totalPeriodo + puntosAcum
  const umbral = preview?.umbral ?? 0
  const comisionGenerada = preview?.comision_generada ?? 0
  const puntosRestantes =
    preview?.puntos_restantes ??
    (totalCalculado >= umbral && umbral > 0 ? totalCalculado - umbral : totalCalculado)
  const superaUmbral = totalCalculado >= umbral && umbral > 0
  const hayRegistrosSinTipo = registros.some((r) => !r.tipo_trabajo)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Este mes" value={`${totalPeriodo} pts`} />
        <SummaryCard label="Acumulado" value={`${puntosAcum} pts`} />
        <SummaryCard label="Total" value={`${totalCalculado.toFixed(2)} pts`} highlight />
        <SummaryCard
          label={`Umbral (${umbral} pts)`}
          value={superaUmbral ? formatMoney(comisionGenerada) : 'No alcanzado'}
          valueClassName={superaUmbral ? 'text-success' : 'text-muted-foreground'}
        />
      </div>

      {/* Alerta registros sin tipo */}
      {hayRegistrosSinTipo && (
        <p className="border-warning/40 bg-warning/5 text-warning border px-3 py-2 text-xs">
          Algunos registros no tienen tipo de trabajo — se usa el valor más reciente configurado
          como fallback. Para mayor precisión, especificá el tipo al agregar puntajes.
        </p>
      )}

      {/* Estado comisión del período */}
      {comisionDelPeriodo ? (
        <div
          className={`flex items-center gap-3 border px-4 py-3 ${
            comisionDelPeriodo.estado === 'LIQUIDADA'
              ? 'border-success/30 bg-success/5'
              : 'border-primary/30 bg-primary/5'
          }`}
        >
          <p className="flex-1 text-sm font-medium">
            {comisionDelPeriodo.estado === 'LIQUIDADA' ? (
              <span className="text-success">
                Comisión liquidada — {formatMoney(comisionDelPeriodo.importe)}
              </span>
            ) : (
              <span className="text-primary">
                Comisión registrada — {formatMoney(comisionDelPeriodo.importe)} pendiente de
                importar en Liquidación
              </span>
            )}
          </p>
          <span
            className={`border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${
              comisionDelPeriodo.estado === 'LIQUIDADA'
                ? 'border-success/30 text-success'
                : 'border-primary/30 text-primary'
            }`}
          >
            {comisionDelPeriodo.estado === 'LIQUIDADA' ? 'Liquidada' : 'Pendiente'}
          </span>
        </div>
      ) : superaUmbral ? (
        <div className="border-success/30 bg-success/5 flex items-center gap-3 border px-4 py-3">
          <p className="text-success flex-1 text-sm font-medium">
            Umbral superado — comisión calculada: {formatMoney(comisionGenerada)}
          </p>
          <Button size="sm" onClick={() => setShowConfirm(true)} disabled={confirmar.isPending}>
            Registrar comisión
          </Button>
        </div>
      ) : null}

      {/* Registros */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Puntajes — {MESES[mes - 1]} {anio}
          </h4>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="border-border bg-surface mb-3 space-y-3 border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Input
                  label="Tarea / descripción *"
                  {...form.register('descripcion')}
                  error={form.formState.errors.descripcion?.message}
                />
              </div>
              <Input
                label="Puntos *"
                type="number"
                step="0.5"
                min="0.5"
                {...form.register('puntos')}
                error={form.formState.errors.puntos?.message}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                  Tipo de trabajo
                </label>
                <select
                  {...form.register('tipo_trabajo')}
                  className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                >
                  <option value="">— Sin especificar</option>
                  {tiposParam.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={agregar.isPending}>
                {agregar.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <Skeletons />
        ) : !registros.length ? (
          <Empty text="Sin puntajes registrados para este período" />
        ) : (
          <div className="border-border overflow-x-auto border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b-2">
                  <Th>Descripción</Th>
                  <Th>Tipo</Th>
                  <Th align="right">Puntos</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-border bg-surface divide-y">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">{r.descripcion}</td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs">
                      {r.tipo_trabajo ?? <span className="italic">sin tipo</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {Number(r.puntos).toFixed(2)}
                    </td>
                    <td className="w-10 px-4 py-2.5">
                      <button
                        onClick={() => setDeleteId(r.id)}
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
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar puntaje"
        description="Se eliminará este registro de puntaje."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) eliminar.mutate(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />

      <ConfirmDialog
        open={showConfirm}
        title="Registrar comisión por puntaje"
        description={`Se guardará una comisión de ${formatMoney(comisionGenerada)} como pendiente de liquidación. El saldo de puntos quedará en ${puntosRestantes.toFixed(2)} pts. Podés importarla a la liquidación cuando quieras.`}
        confirmLabel="Registrar"
        onConfirm={() => {
          confirmar.mutate()
          setShowConfirm(false)
        }}
        onCancel={() => setShowConfirm(false)}
        isPending={confirmar.isPending}
      />
    </div>
  )
}

// ── Panel: Horas ──────────────────────────────────────────────

function ComisionHorasPanel({
  empleadaId,
  mes,
  anio,
}: {
  empleadaId: string
  mes: number
  anio: number
}) {
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: registros = [], isLoading } = useHorasPeriodo(empleadaId, mes, anio)
  const { data: resumen } = useCalcularHoras(empleadaId, mes, anio)
  const agregar = useAgregarHoras(empleadaId, mes, anio)
  const eliminar = useEliminarHoras(empleadaId, mes, anio)

  const form = useForm<TRegistroHorasForm>({
    resolver: zodResolver(registroHorasSchema) as unknown as Resolver<TRegistroHorasForm>,
    defaultValues: {
      empleada_id: empleadaId,
      fecha: toLocalDateInputValue(),
      horas: 0,
      descripcion: '',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const r = await agregar.mutateAsync(data)
    if (r.ok) {
      form.reset({
        empleada_id: empleadaId,
        fecha: toLocalDateInputValue(),
        horas: 0,
        descripcion: '',
      })
      setShowForm(false)
    }
  })

  const totalHoras = registros.reduce((s, r) => s + Number(r.horas), 0)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Horas trabajadas" value={`${totalHoras.toFixed(2)} hs`} />
        <SummaryCard label="Valor por hora" value={formatMoney(resumen?.valor_hora ?? 0)} />
        <SummaryCard
          label="Total a pagar"
          value={formatMoney(resumen?.total_pagar ?? 0)}
          highlight
        />
      </div>

      {/* Registros */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Horas — {MESES[mes - 1]} {anio}
          </h4>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="border-border bg-surface mb-3 space-y-3 border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Fecha *"
                type="date"
                {...form.register('fecha')}
                error={form.formState.errors.fecha?.message}
              />
              <Input
                label="Horas *"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                {...form.register('horas')}
                error={form.formState.errors.horas?.message}
              />
              <Input label="Descripción" {...form.register('descripcion')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={agregar.isPending}>
                {agregar.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <Skeletons />
        ) : !registros.length ? (
          <Empty text="Sin horas registradas para este período" />
        ) : (
          <div className="border-border overflow-x-auto border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b-2">
                  <Th>Fecha</Th>
                  <Th align="right">Horas</Th>
                  <Th>Descripción</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-border bg-surface divide-y">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 tabular-nums">{formatDate(r.fecha)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {Number(r.horas).toFixed(2)}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-sm">
                      {r.descripcion ?? '—'}
                    </td>
                    <td className="w-10 px-4 py-2.5">
                      <button
                        onClick={() => setDeleteId(r.id)}
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
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar registro de horas"
        description="Se eliminará este registro."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) eliminar.mutate(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
        isPending={eliminar.isPending}
      />

      {(resumen?.total_pagar ?? 0) > 0 && (
        <p className="text-muted-foreground text-xs">
          Para agregar el total a la liquidación, usá el botón &quot;Agregar concepto&quot; en la
          solapa Liquidación.
        </p>
      )}
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
  valueClassName,
}: {
  label: string
  value: string
  highlight?: boolean
  valueClassName?: string
}) {
  return (
    <div
      className={`border px-4 py-3 ${highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'}`}
    >
      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-bold tabular-nums ${highlight ? 'text-primary' : ''} ${valueClassName ?? ''}`}
      >
        {value}
      </p>
    </div>
  )
}

function Th({ children, align }: { children?: ReactNode; align?: 'right' }) {
  return (
    <th
      className={`text-muted-foreground px-4 py-2.5 text-[10px] font-bold tracking-[0.14em] uppercase ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  )
}

function Skeletons() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-none" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
      {text}
    </p>
  )
}
