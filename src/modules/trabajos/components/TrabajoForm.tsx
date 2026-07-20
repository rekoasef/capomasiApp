'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { trabajoSchema, type TTrabajoForm } from '../schemas/trabajoSchema'
import { useCrearTrabajo } from '../hooks/useTrabajos'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { calcularImporteFacturado } from '@/modules/cobranzas/services/calcularImporteFacturado'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_COMPROBANTE, FALLBACK_TIPOS_SERVICIO } from '@/shared/lib/parametros'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const ANIOS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

export function TrabajoForm({ clienteId, onSuccess, onCancel }: Props) {
  const crear = useCrearTrabajo()
  const { data: tiposTrabajo = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_TRABAJO', 'TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })
  const { data: tiposComprobante = FALLBACK_TIPOS_COMPROBANTE } = useParametros({
    categorias: ['TIPO_COMPROBANTE'],
    fallback: FALLBACK_TIPOS_COMPROBANTE,
  })
  const { data: empleadas = [] } = useEmpleadas()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TTrabajoForm>({
    resolver: zodResolver(trabajoSchema) as Resolver<TTrabajoForm>,
    defaultValues: {
      cliente_id: clienteId,
      anio: new Date().getFullYear(),
    },
  })

  const honorario = watch('honorario')
  const tipoComprobante = watch('tipo_comprobante')

  const importeFacturado = calcularImporteFacturado(Number(honorario || 0), tipoComprobante)
  const aplicaIva = tipoComprobante === 'FC_A' && Number(honorario || 0) > 0

  const empleadaOptions = [
    { value: '', label: 'Sin asignar' },
    ...empleadas
      .filter((e) => e.activo)
      .map((e) => ({
        value: e.id,
        label: `${e.nombre}${e.apellido ? ' ' + e.apellido : ''}`,
      })),
  ]

  async function onSubmit(data: TTrabajoForm) {
    const payload = {
      ...data,
      asignado_a: data.asignado_a || null,
      fecha_vencimiento: data.fecha_vencimiento || null,
    }
    const result = await crear.mutateAsync(payload)
    if (result.ok) {
      reset()
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_trabajo"
          label="Tipo de trabajo *"
          options={tiposTrabajo}
          placeholder="Seleccionar"
          error={errors.tipo_trabajo?.message}
          disabled={crear.isPending}
          {...register('tipo_trabajo')}
        />
        <Select
          id="anio"
          label="Año *"
          options={ANIOS}
          error={errors.anio?.message}
          disabled={crear.isPending}
          {...register('anio')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="asignado_a"
          label="Responsable"
          options={empleadaOptions}
          disabled={crear.isPending}
          {...register('asignado_a')}
        />
        <Input
          id="fecha_vencimiento"
          label="Vencimiento"
          type="date"
          disabled={crear.isPending}
          {...register('fecha_vencimiento')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="honorario"
          label="Honorario (sin IVA)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Se puede cargar después"
          error={errors.honorario?.message}
          disabled={crear.isPending}
          {...register('honorario')}
        />
        <Select
          id="tipo_comprobante"
          label="Comprobante"
          options={tiposComprobante}
          placeholder="Sin comprobante"
          disabled={crear.isPending}
          {...register('tipo_comprobante')}
        />
      </div>

      {importeFacturado > 0 && (
        <div className="border-border bg-muted/20 rounded-md border px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total a facturar al cliente</span>
            <span className="text-foreground text-base font-semibold">
              {formatMoney(importeFacturado)}
            </span>
          </div>
          {aplicaIva && (
            <p className="text-muted-foreground mt-1 text-xs">
              Incluye 21% de IVA ({formatMoney(importeFacturado - Number(honorario))})
            </p>
          )}
        </div>
      )}

      <Textarea id="notas" label="Notas" disabled={crear.isPending} {...register('notas')} />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={crear.isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
