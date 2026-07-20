'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  vencimientoFiscalSchema,
  type TVencimientoFiscalForm,
} from '../schemas/vencimientoFiscalSchema'
import { useCrearVencimientoFiscal } from '../hooks/useVencimientosFiscales'
import { useClientes } from '@/modules/clientes/hooks/useClientes'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { useParametros } from '@/shared/hooks/useParametros'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'

const FALLBACK_TIPOS_VENC = [
  { value: 'AFIP', label: 'AFIP' },
  { value: 'IIBB_PROVINCIAL', label: 'IIBB Provincial' },
  { value: 'IIBB_MUNICIPAL', label: 'IIBB Municipal' },
  { value: 'GANANCIAS', label: 'Ganancias' },
  { value: 'BIENES_PERSONALES', label: 'Bienes Personales' },
  { value: 'OTRO', label: 'Otro' },
]

type Props = {
  onSuccess: () => void
  onCancel: () => void
}

export function VencimientoFiscalForm({ onSuccess, onCancel }: Props) {
  const crear = useCrearVencimientoFiscal()
  const { data: clientes = [] } = useClientes()
  const { data: empleadas = [] } = useEmpleadas()
  const { data: tiposVenc = FALLBACK_TIPOS_VENC } = useParametros({
    categorias: ['TIPO_VENCIMIENTO'],
    fallback: FALLBACK_TIPOS_VENC,
  })

  const form = useForm<TVencimientoFiscalForm>({
    resolver: zodResolver(vencimientoFiscalSchema),
    defaultValues: {
      ambito: 'CLIENTE',
      descripcion: '',
    },
  })

  const onSubmit = async (data: TVencimientoFiscalForm) => {
    const result = await crear.mutateAsync(data)
    if (result.ok) onSuccess()
  }

  const clienteOptions = clientes.map((c) => ({ value: c.id, label: c.nombre }))
  const empleadaOptions = empleadas
    .filter((e) => e.activo)
    .map((e) => ({ value: e.id, label: `${e.nombre}${e.apellido ? ' ' + e.apellido : ''}` }))

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Select
        id="cliente_id"
        label="Cliente *"
        options={clienteOptions}
        placeholder="Seleccionar cliente"
        {...form.register('cliente_id')}
        error={form.formState.errors.cliente_id?.message}
      />

      <Select
        id="tipo_vencimiento"
        label="Tipo de vencimiento *"
        options={tiposVenc}
        placeholder="Seleccionar tipo"
        {...form.register('tipo_vencimiento')}
        error={form.formState.errors.tipo_vencimiento?.message}
      />

      <Input
        label="Descripción *"
        placeholder="Ej: Ganancias Personas Físicas 2024"
        {...form.register('descripcion')}
        error={form.formState.errors.descripcion?.message}
      />

      <Input
        label="Fecha de vencimiento *"
        type="date"
        {...form.register('fecha_vencimiento')}
        error={form.formState.errors.fecha_vencimiento?.message}
      />

      <Select
        id="empleada_id"
        label="Responsable"
        options={empleadaOptions}
        placeholder="Sin asignar"
        {...form.register('empleada_id')}
        error={form.formState.errors.empleada_id?.message}
      />

      <Select
        id="ambito"
        label="Ámbito"
        options={[
          { value: 'CLIENTE', label: 'Cliente' },
          { value: 'ESTUDIO', label: 'Estudio' },
        ]}
        {...form.register('ambito')}
        error={form.formState.errors.ambito?.message}
      />

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
