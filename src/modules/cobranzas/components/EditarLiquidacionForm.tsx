'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editarLiquidacionSchema, type TEditarLiquidacionForm } from '../schemas/liquidacionSchema'
import { useEditarLiquidacion } from '../hooks/useCobranzas'
import { calcularImporteFacturado } from '../services/calcularImporteFacturado'
import { calcularTotalImputado } from '../services/calcularSaldo'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_GENERADO_POR,
  FALLBACK_TIPOS_COMPROBANTE,
  FALLBACK_TIPOS_SERVICIO,
} from '@/shared/lib/parametros'
import type { TLiquidacionConImputaciones } from '../types'

type Props = {
  clienteId: string
  liquidacion: TLiquidacionConImputaciones
  onSuccess?: () => void
  onCancel?: () => void
}

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
].map((m) => ({ value: m, label: m }))

export function EditarLiquidacionForm({ clienteId, liquidacion, onSuccess, onCancel }: Props) {
  const editar = useEditarLiquidacion(clienteId)
  const cobrado = calcularTotalImputado(liquidacion.imputaciones)

  const { data: tiposServicio = FALLBACK_TIPOS_SERVICIO } = useParametros({
    categorias: ['TIPO_SERVICIO'],
    fallback: FALLBACK_TIPOS_SERVICIO,
  })
  const { data: generadoPorOptions = FALLBACK_GENERADO_POR } = useParametros({
    categorias: ['GENERADO_POR', 'EMISOR'],
    fallback: FALLBACK_GENERADO_POR,
  })
  const { data: tiposComprobante = FALLBACK_TIPOS_COMPROBANTE } = useParametros({
    categorias: ['TIPO_COMPROBANTE'],
    fallback: FALLBACK_TIPOS_COMPROBANTE,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TEditarLiquidacionForm>({
    resolver: zodResolver(editarLiquidacionSchema) as Resolver<TEditarLiquidacionForm>,
    defaultValues: {
      id: liquidacion.id,
      tipo_servicio: liquidacion.tipo_servicio,
      fecha_liquidacion: liquidacion.fecha_liquidacion,
      generado_por: liquidacion.generado_por ?? '',
      periodo_mes: liquidacion.periodo_mes ?? '',
      periodo_anio: liquidacion.periodo_anio ?? undefined,
      importe_liquidado: liquidacion.importe_liquidado,
      tipo_comprobante: liquidacion.tipo_comprobante ?? '',
      nro_comprobante: liquidacion.nro_comprobante ?? '',
      detalle: liquidacion.detalle ?? '',
      notas: liquidacion.notas ?? '',
    },
  })

  const importeLiquidado = watch('importe_liquidado')
  const tipoComprobante = watch('tipo_comprobante')

  // El número de presupuesto lo asigna la DB; si deja de ser presupuesto, el
  // P-XXXX viejo no sirve para una factura
  useEffect(() => {
    const nro = getValues('nro_comprobante') ?? ''
    if (tipoComprobante === 'PRESUPUESTO' && nro && !nro.startsWith('P-')) {
      setValue('nro_comprobante', '', { shouldDirty: true })
    }
    if (tipoComprobante !== 'PRESUPUESTO' && nro.startsWith('P-')) {
      setValue('nro_comprobante', '', { shouldDirty: true })
    }
  }, [tipoComprobante, getValues, setValue])

  const importeFacturado = calcularImporteFacturado(Number(importeLiquidado || 0), tipoComprobante)
  const aplicaIva = tipoComprobante === 'FC_A' && Number(importeLiquidado || 0) > 0

  async function onSubmit(data: TEditarLiquidacionForm) {
    const result = await editar.mutateAsync(data)
    if (result.ok) onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('id')} />

      {cobrado > 0 && (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-md border px-3 py-2 text-xs">
          Ya se cobraron {formatMoney(cobrado)} contra esta liquidación: el total a cobrar no puede
          quedar por debajo de ese importe. Si necesitás bajarlo, primero desimputá los recibos.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_servicio"
          label="Tipo de servicio *"
          options={tiposServicio}
          placeholder="Seleccionar"
          error={errors.tipo_servicio?.message}
          disabled={editar.isPending}
          {...register('tipo_servicio')}
        />
        <Input
          id="fecha_liquidacion"
          label="Fecha *"
          type="date"
          error={errors.fecha_liquidacion?.message}
          disabled={editar.isPending}
          {...register('fecha_liquidacion')}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          id="generado_por"
          label="Generado por"
          options={generadoPorOptions}
          placeholder="Sin emisor"
          disabled={editar.isPending}
          {...register('generado_por')}
        />
        <Select
          id="periodo_mes"
          label="Período (mes)"
          options={MESES}
          placeholder="Sin período"
          disabled={editar.isPending}
          {...register('periodo_mes')}
        />
        <Input
          id="periodo_anio"
          label="Período (año)"
          type="number"
          placeholder="2026"
          min="2020"
          max="2100"
          disabled={editar.isPending}
          {...register('periodo_anio')}
        />
      </div>

      <Input
        id="importe_liquidado"
        label="Importe liquidado (sin IVA) *"
        type="number"
        step="0.01"
        min="0.01"
        error={errors.importe_liquidado?.message}
        disabled={editar.isPending}
        {...register('importe_liquidado')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_comprobante"
          label="Comprobante"
          options={tiposComprobante}
          placeholder="Sin comprobante"
          disabled={editar.isPending}
          {...register('tipo_comprobante')}
        />
        <div>
          <Input
            id="nro_comprobante"
            label="Nro. comprobante"
            placeholder={tipoComprobante === 'PRESUPUESTO' ? 'Se asigna al guardar' : ''}
            disabled={editar.isPending || tipoComprobante === 'PRESUPUESTO'}
            {...register('nro_comprobante')}
          />
          {tipoComprobante === 'PRESUPUESTO' && (
            <p className="text-muted-foreground mt-1 text-xs">
              El número de presupuesto lo asigna el sistema (P-XXXX)
            </p>
          )}
        </div>
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
              Incluye 21% de IVA ({formatMoney(importeFacturado - Number(importeLiquidado))})
            </p>
          )}
        </div>
      )}

      <Textarea
        id="detalle"
        label="Detalle / Notas"
        disabled={editar.isPending}
        {...register('detalle')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={editar.isPending}>
          {editar.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={editar.isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
