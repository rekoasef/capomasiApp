'use client'

import { type ReactNode, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { empleadaSchema, type TEmpleadaForm } from '../schemas/empleadaSchema'
import { useActualizarEmpleada } from '../hooks/useEmpleadas'
import type { TEmpleada } from '../types'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { formatDate } from '@/shared/utils/formatters'
import { Pencil } from 'lucide-react'

const TIPO_COMISION_LABEL: Record<string, string> = {
  PRODUCCION: 'Por producción',
  PUNTAJE: 'Por puntaje / objetivos',
  HORAS: 'Por horas trabajadas',
  NINGUNA: 'Sin comisión',
}

interface Props {
  empleada: TEmpleada
}

export function LegajoSection({ empleada }: Props) {
  const [editing, setEditing] = useState(false)
  const actualizar = useActualizarEmpleada(empleada.id)

  const form = useForm<TEmpleadaForm>({
    resolver: zodResolver(empleadaSchema) as unknown as Resolver<TEmpleadaForm>,
    defaultValues: {
      nombre: empleada.nombre,
      apellido: empleada.apellido ?? '',
      tipo_relacion: empleada.tipo_relacion,
      tipo_comision: empleada.tipo_comision ?? 'NINGUNA',
      activo: empleada.activo,
      fecha_nacimiento: empleada.fecha_nacimiento ?? '',
      dni: empleada.dni ?? '',
      email: empleada.email ?? '',
      telefono: empleada.telefono ?? '',
      direccion: empleada.direccion ?? '',
      localidad: empleada.localidad ?? '',
      cbu: empleada.cbu ?? '',
      alias_cbu: empleada.alias_cbu ?? '',
      fecha_ingreso: empleada.fecha_ingreso ?? '',
      sueldo_fijo: empleada.sueldo_fijo ?? null,
      valor_hora: empleada.valor_hora ?? null,
      usuario_id: empleada.usuario_id ?? undefined,
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const r = await actualizar.mutateAsync(data)
    if (r.ok) setEditing(false)
  })

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Editar datos</h3>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={actualizar.isPending}>
              {actualizar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset()
                setEditing(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>

        <Section title="Información personal">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nombre *"
              {...form.register('nombre')}
              error={form.formState.errors.nombre?.message}
            />
            <Input label="Apellido" {...form.register('apellido')} />
            <Input label="DNI" {...form.register('dni')} />
            <Input label="Fecha de nacimiento" type="date" {...form.register('fecha_nacimiento')} />
            <Input
              label="Email"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Input label="Teléfono" {...form.register('telefono')} />
            <Input label="Dirección" {...form.register('direccion')} />
            <Input label="Localidad" {...form.register('localidad')} />
          </div>
        </Section>

        <Section title="Datos bancarios">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="CBU" {...form.register('cbu')} />
            <Input label="Alias" {...form.register('alias_cbu')} />
          </div>
        </Section>

        <Section title="Información laboral">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-cols-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo de relación *
              </label>
              <select
                {...form.register('tipo_relacion')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="DEPENDENCIA">Relación de dependencia</option>
                <option value="POR_HORA">Por hora</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Tipo de comisión
              </label>
              <select
                {...form.register('tipo_comision')}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="NINGUNA">Sin comisión</option>
                <option value="PRODUCCION">Por producción</option>
                <option value="PUNTAJE">Por puntaje / objetivos</option>
                <option value="HORAS">Por horas trabajadas</option>
              </select>
            </div>
            <Input
              label="Sueldo fijo"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('sueldo_fijo')}
              error={form.formState.errors.sueldo_fijo?.message}
            />
            <Input
              label="Valor hora"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('valor_hora')}
              error={form.formState.errors.valor_hora?.message}
            />
            <Input label="Fecha de ingreso" type="date" {...form.register('fecha_ingreso')} />
            <div>
              <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                Estado
              </label>
              <select
                {...form.register('activo', { setValueAs: (v) => v === 'true' || v === true })}
                className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>
          </div>
        </Section>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Legajo</h3>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>
      </div>

      <Section title="Información personal">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field
            label="Nombre"
            value={[empleada.nombre, empleada.apellido].filter(Boolean).join(' ')}
          />
          <Field label="DNI" value={empleada.dni} />
          <Field
            label="Nacimiento"
            value={empleada.fecha_nacimiento ? formatDate(empleada.fecha_nacimiento) : null}
          />
          <Field label="Email" value={empleada.email} />
          <Field label="Teléfono" value={empleada.telefono} />
          <Field label="Localidad" value={empleada.localidad} />
          <Field label="Dirección" value={empleada.direccion} className="sm:col-span-2" />
        </dl>
      </Section>

      <Section title="Datos bancarios">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="CBU" value={empleada.cbu} />
          <Field label="Alias" value={empleada.alias_cbu} />
        </dl>
      </Section>

      <Section title="Información laboral">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field
            label="Tipo de relación"
            value={
              empleada.tipo_relacion === 'DEPENDENCIA' ? 'Relación de dependencia' : 'Por hora'
            }
          />
          <Field
            label="Tipo de comisión"
            value={TIPO_COMISION_LABEL[empleada.tipo_comision ?? 'NINGUNA']}
          />
          <Field
            label="Sueldo fijo"
            value={
              empleada.sueldo_fijo != null
                ? `$${Number(empleada.sueldo_fijo).toLocaleString('es-AR')}`
                : null
            }
          />
          <Field
            label="Valor hora"
            value={
              empleada.valor_hora != null
                ? `$${Number(empleada.valor_hora).toLocaleString('es-AR')}`
                : null
            }
          />
          <Field
            label="Fecha de ingreso"
            value={empleada.fecha_ingreso ? formatDate(empleada.fecha_ingreso) : null}
          />
          <Field
            label="Estado"
            value={empleada.activo ? 'Activa' : 'Inactiva'}
            valueClassName={empleada.activo ? 'text-success' : 'text-muted-foreground'}
          />
        </dl>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground border-border mb-3 border-b pb-1.5 text-[10px] font-bold tracking-[0.14em] uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: string | null | undefined
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm ${valueClassName ?? ''} ${!value ? 'text-muted-foreground italic' : ''}`}
      >
        {value ?? '—'}
      </dd>
    </div>
  )
}
