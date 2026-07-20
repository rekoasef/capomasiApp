'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParametros } from '@/shared/hooks/useParametros'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import {
  usePuntosTrabajoConfig,
  useUpsertPuntosTrabajoConfig,
  useDeletePuntosTrabajoConfig,
} from '@/modules/empleadas/hooks/useEmpleadas'
import {
  puntosTrabajoConfigSchema,
  type TPuntosTrabajoConfigForm,
} from '@/modules/empleadas/schemas/empleadaSchema'
import { vencimientosFiscalesService } from '@/modules/vencimientos/services/vencimientosFiscalesService'
import type { TTipoVencimientoConfig } from '@/modules/empleadas/types'
import { useAuth } from '@/lib/auth/useAuth'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TIPO_LABEL: Record<TTipoVencimientoConfig, string> = {
  MENSUAL: 'Mensual',
  ANUAL: 'Anual',
  A_DEMANDA: 'A demanda',
}

function vencimientoLabel(config: {
  tipo_vencimiento: TTipoVencimientoConfig
  dia_vencimiento_mensual: number | null
  mes_vencimiento_anual: number | null
  dia_vencimiento_anual: number | null
}) {
  if (config.tipo_vencimiento === 'MENSUAL' && config.dia_vencimiento_mensual) {
    return `Día ${config.dia_vencimiento_mensual} de cada mes`
  }
  if (
    config.tipo_vencimiento === 'ANUAL' &&
    config.mes_vencimiento_anual &&
    config.dia_vencimiento_anual
  ) {
    return `${config.dia_vencimiento_anual} de ${MESES[config.mes_vencimiento_anual - 1]} cada año`
  }
  return 'A demanda'
}

interface Props {
  clienteId: string
}

const DEFAULT_VALUES = (clienteId: string): TPuntosTrabajoConfigForm => ({
  cliente_id: clienteId,
  tipo_trabajo: '',
  puntos: 0,
  activo: true,
  empleada_id: null,
  tipo_vencimiento: 'A_DEMANDA',
  dia_vencimiento_mensual: null,
  mes_vencimiento_anual: null,
  dia_vencimiento_anual: null,
  fecha_demanda: null,
})

export function PuntosClienteSection({ clienteId }: Props) {
  const { isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: config = [], isLoading } = usePuntosTrabajoConfig(clienteId)
  const upsert = useUpsertPuntosTrabajoConfig()
  const eliminar = useDeletePuntosTrabajoConfig()

  const { data: tiposTrabajo = [] } = useParametros({ categorias: ['TIPO_SERVICIO'] })
  const { data: empleadas = [] } = useEmpleadas()

  const form = useForm<TPuntosTrabajoConfigForm>({
    resolver: zodResolver(
      puntosTrabajoConfigSchema
    ) as unknown as Resolver<TPuntosTrabajoConfigForm>,
    defaultValues: DEFAULT_VALUES(clienteId),
  })

  const tipoVencimiento = form.watch('tipo_vencimiento')

  const onSubmit = form.handleSubmit(async (data) => {
    const { fecha_demanda, ...configData } = data
    const r = await upsert.mutateAsync({ ...configData, cliente_id: clienteId })
    if (!r.ok) return

    // Si es A_DEMANDA con fecha, crear el vencimiento directamente
    if (data.tipo_vencimiento === 'A_DEMANDA' && fecha_demanda && r.data) {
      const labelTipoTrabajo =
        tiposTrabajo.find((o) => o.value === data.tipo_trabajo)?.label ?? data.tipo_trabajo
      const vResult = await vencimientosFiscalesService.create({
        cliente_id: clienteId,
        empleada_id: data.empleada_id ?? null,
        tipo_vencimiento: data.tipo_trabajo,
        fecha_vencimiento: fecha_demanda,
        descripcion: labelTipoTrabajo,
        ambito: 'CLIENTE',
        puntos_config_id: r.data.id,
        puntos_snapshot: Number(data.puntos),
      } as Parameters<typeof vencimientosFiscalesService.create>[0])
      if (!vResult.ok) {
        toast.error(`Trabajo guardado, pero no se pudo crear el vencimiento: ${vResult.error}`)
      } else {
        toast.success('Trabajo guardado y vencimiento creado')
      }
    }

    form.reset(DEFAULT_VALUES(clienteId))
    setShowForm(false)
  })

  const handleCancel = () => {
    form.reset(DEFAULT_VALUES(clienteId))
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Trabajos y vencimientos</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Tipos de trabajo asignados a este cliente, sus puntos y recurrencia de vencimiento
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar
          </Button>
        )}
      </div>

      {/* Formulario */}
      {isAdmin && showForm && (
        <form onSubmit={onSubmit} className="border-border bg-surface space-y-4 border p-4">
          {/* Fila 1: tipo trabajo + puntos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo de trabajo *
              </label>
              <select
                {...form.register('tipo_trabajo')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                {tiposTrabajo.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.tipo_trabajo && (
                <p className="text-danger mt-1 text-xs">
                  {form.formState.errors.tipo_trabajo.message}
                </p>
              )}
            </div>
            <Input
              label="Puntos (0 = sin comisión)"
              type="number"
              step="0.5"
              min="0"
              {...form.register('puntos')}
              error={form.formState.errors.puntos?.message}
            />
          </div>

          {/* Fila 2: empleada + tipo vencimiento */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Empleada responsable
              </label>
              <select
                {...form.register('empleada_id')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {empleadas
                  .filter((e) => e.activo)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                      {e.apellido ? ` ${e.apellido}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo de vencimiento *
              </label>
              <select
                {...form.register('tipo_vencimiento')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="A_DEMANDA">A demanda</option>
                <option value="MENSUAL">Mensual (se repite cada mes)</option>
                <option value="ANUAL">Anual (se repite cada año)</option>
              </select>
            </div>
          </div>

          {/* Campos condicionales según tipo */}
          {tipoVencimiento === 'MENSUAL' && (
            <div className="max-w-xs">
              <Input
                label="Día del mes que vence (1–31) *"
                type="number"
                min="1"
                max="31"
                placeholder="Ej: 6"
                {...form.register('dia_vencimiento_mensual')}
                error={form.formState.errors.dia_vencimiento_mensual?.message}
              />
            </div>
          )}

          {tipoVencimiento === 'ANUAL' && (
            <div className="grid max-w-xs grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                  Mes *
                </label>
                <select
                  {...form.register('mes_vencimiento_anual')}
                  className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                >
                  <option value="">Mes...</option>
                  {MESES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                {form.formState.errors.mes_vencimiento_anual && (
                  <p className="text-danger mt-1 text-xs">
                    {form.formState.errors.mes_vencimiento_anual.message}
                  </p>
                )}
              </div>
              <Input
                label="Día *"
                type="number"
                min="1"
                max="31"
                placeholder="Ej: 15"
                {...form.register('dia_vencimiento_anual')}
                error={form.formState.errors.dia_vencimiento_anual?.message}
              />
            </div>
          )}

          {tipoVencimiento === 'A_DEMANDA' && (
            <div className="max-w-xs">
              <Input
                label="Fecha de vencimiento (opcional)"
                type="date"
                {...form.register('fecha_demanda')}
                error={form.formState.errors.fecha_demanda?.message}
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                Si completás la fecha, se genera el vencimiento ahora. Podés dejarlo vacío y crearlo
                después.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Listado */}
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : !config.length ? (
        <p className="text-muted-foreground py-6 text-center text-xs tracking-widest uppercase">
          Sin trabajos configurados para este cliente
        </p>
      ) : (
        <div className="border-border divide-border divide-y border">
          {config.map((c) => (
            <div
              key={c.id}
              className="bg-surface hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{c.tipo_trabajo}</span>
                  <span className="border-border text-muted-foreground border px-1.5 py-0.5 text-[11px]">
                    {TIPO_LABEL[c.tipo_vencimiento as TTipoVencimientoConfig]}
                  </span>
                  {c.empleadas && (
                    <span className="text-muted-foreground text-[11px]">
                      → {c.empleadas.nombre}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {vencimientoLabel(
                    c as {
                      tipo_vencimiento: TTipoVencimientoConfig
                      dia_vencimiento_mensual: number | null
                      mes_vencimiento_anual: number | null
                      dia_vencimiento_anual: number | null
                    }
                  )}
                  {c.puntos > 0 && (
                    <span className="text-foreground ml-2 font-semibold">
                      {Number(c.puntos).toFixed(2)} pts
                    </span>
                  )}
                  {c.puntos === 0 && (
                    <span className="text-muted-foreground/60 ml-2">sin puntos</span>
                  )}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="text-muted-foreground hover:text-danger shrink-0 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar configuración"
        description="Se eliminará este trabajo del cliente. Los vencimientos ya generados no se verán afectados."
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
