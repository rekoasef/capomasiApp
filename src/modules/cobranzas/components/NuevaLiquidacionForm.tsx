'use client'

import { useEffect, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { liquidacionSchema, type TLiquidacionForm } from '../schemas/liquidacionSchema'
import {
  useCrearLiquidacion,
  useUltimaLiquidacionCliente,
} from '../hooks/useCobranzas'
import { useHonorarioActivo } from '@/modules/honorarios/hooks/useHonorarios'
import { calcularImporteFacturado } from '../services/calcularImporteFacturado'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { formatMoney } from '@/shared/utils/formatters'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_GENERADO_POR,
  FALLBACK_TIPOS_COMPROBANTE,
  FALLBACK_TIPOS_SERVICIO,
} from '@/shared/lib/parametros'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
].map((m) => ({ value: m, label: m }))

function siguientePeriodo(
  mes: string | null | undefined,
  anio: number | null | undefined,
): { mes: string | undefined; anio: number | undefined } {
  if (!mes || !anio) return { mes: undefined, anio: undefined }
  const idx = MESES.findIndex((m) => m.value === mes)
  if (idx < 0) return { mes: undefined, anio: undefined }
  if (idx === 11) return { mes: 'Enero', anio: anio + 1 }
  return { mes: MESES[idx + 1].value, anio }
}

export function NuevaLiquidacionForm({ clienteId, onSuccess, onCancel }: Props) {
  const crear = useCrearLiquidacion()
  const { data: honorarioActivo } = useHonorarioActivo(clienteId)
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
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TLiquidacionForm>({
    resolver: zodResolver(liquidacionSchema) as Resolver<TLiquidacionForm>,
    defaultValues: {
      cliente_id: clienteId,
      fecha_liquidacion: toLocalDateInputValue(),
      tipo_liquidacion: 'NORMAL',
    },
  })

  const tipoServicio = watch('tipo_servicio')
  const importeLiquidado = watch('importe_liquidado')
  const tipoComprobante = watch('tipo_comprobante')

  const { data: ultima } = useUltimaLiquidacionCliente(clienteId, tipoServicio)
  const precargadoFor = useRef<string | null>(null)

  // Auto-precarga desde la última liquidación del mismo tipo de servicio
  useEffect(() => {
    if (!tipoServicio) return
    if (precargadoFor.current === tipoServicio) return
    if (ultima === undefined) return // aún cargando
    precargadoFor.current = tipoServicio

    if (ultima) {
      const { mes, anio } = siguientePeriodo(ultima.periodo_mes, ultima.periodo_anio)
      setValue('importe_liquidado', ultima.importe_liquidado, { shouldDirty: false })
      if (ultima.generado_por) {
        setValue('generado_por', ultima.generado_por, { shouldDirty: false })
      }
      if (ultima.tipo_comprobante) {
        setValue('tipo_comprobante', ultima.tipo_comprobante, { shouldDirty: false })
      }
      if (mes) setValue('periodo_mes', mes, { shouldDirty: false })
      if (anio) setValue('periodo_anio', anio, { shouldDirty: false })
      return
    }

    // No hay última: si es honorario mensual, usar el honorario activo
    if (tipoServicio === 'HONORARIO_MENSUAL' && honorarioActivo?.monto) {
      setValue('importe_liquidado', honorarioActivo.monto, { shouldDirty: false })
    }
  }, [tipoServicio, ultima, honorarioActivo?.monto, setValue])

  // Cuando se elige PRESUPUESTO, limpiar el nro_comprobante (se asigna al guardar)
  useEffect(() => {
    if (tipoComprobante === 'PRESUPUESTO') {
      setValue('nro_comprobante', '', { shouldDirty: false })
    }
  }, [tipoComprobante, setValue])

  const importeFacturado = calcularImporteFacturado(
    Number(importeLiquidado || 0),
    tipoComprobante,
  )
  const aplicaIva = tipoComprobante === 'FC_A' && Number(importeLiquidado || 0) > 0

  async function onSubmit(data: TLiquidacionForm) {
    const result = await crear.mutateAsync({ clienteId, form: data })
    if (result.ok) {
      reset()
      precargadoFor.current = null
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_servicio"
          label="Tipo de servicio *"
          options={tiposServicio}
          placeholder="Seleccionar"
          error={errors.tipo_servicio?.message}
          disabled={crear.isPending}
          {...register('tipo_servicio')}
        />
        <Input
          id="fecha_liquidacion"
          label="Fecha *"
          type="date"
          error={errors.fecha_liquidacion?.message}
          disabled={crear.isPending}
          {...register('fecha_liquidacion')}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          id="generado_por"
          label="Generado por"
          options={generadoPorOptions}
          placeholder="Sin emisor"
          disabled={crear.isPending}
          {...register('generado_por')}
        />
        <Select
          id="periodo_mes"
          label="Período (mes)"
          options={MESES}
          placeholder="Sin período"
          disabled={crear.isPending}
          {...register('periodo_mes')}
        />
        <Input
          id="periodo_anio"
          label="Período (año)"
          type="number"
          placeholder="2026"
          min="2020"
          max="2100"
          disabled={crear.isPending}
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
        disabled={crear.isPending}
        {...register('importe_liquidado')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_comprobante"
          label="Comprobante"
          options={tiposComprobante}
          placeholder="Sin comprobante"
          disabled={crear.isPending}
          {...register('tipo_comprobante')}
        />
        <div>
          <Input
            id="nro_comprobante"
            label="Nro. comprobante"
            placeholder={
              tipoComprobante === 'PRESUPUESTO' ? 'Se asigna al guardar' : ''
            }
            disabled={crear.isPending || tipoComprobante === 'PRESUPUESTO'}
            {...register('nro_comprobante')}
          />
          {tipoComprobante === 'PRESUPUESTO' && (
            <p className="mt-1 text-xs text-muted-foreground">
              El sistema asigna el siguiente número de presupuesto (P-XXXX)
            </p>
          )}
        </div>
      </div>

      {importeFacturado > 0 && (
        <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total a facturar al cliente</span>
            <span className="text-base font-semibold text-foreground">
              {formatMoney(importeFacturado)}
            </span>
          </div>
          {aplicaIva && (
            <p className="mt-1 text-xs text-muted-foreground">
              Incluye 21% de IVA ({formatMoney(importeFacturado - Number(importeLiquidado))})
            </p>
          )}
        </div>
      )}

      <Textarea
        id="detalle"
        label="Detalle / Notas"
        disabled={crear.isPending}
        {...register('detalle')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={crear.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
