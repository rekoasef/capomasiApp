'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { liquidacionesService } from '@/modules/cobranzas/services/liquidacionesService'
import { vencimientosFiscalesService } from '../services/vencimientosFiscalesService'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_COMPROBANTE } from '@/shared/lib/parametros'
import { calcularImporteFacturado } from '@/modules/cobranzas/services/calcularImporteFacturado'
import { formatMoney } from '@/shared/utils/formatters'
import type { TVencimientoFiscalConCliente } from '../types'

const schema = z.object({
  fecha_liquidacion: z.string().min(1, 'Fecha requerida'),
  importe_liquidado: z
    .string()
    .min(1, 'Importe requerido')
    .refine((v) => Number(v) > 0, 'El importe debe ser mayor a 0'),
  tipo_comprobante: z.string().optional(),
  nro_comprobante: z.string().optional(),
  notas: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  vencimientos: TVencimientoFiscalConCliente[]
  onSuccess: () => void
  onCancel: () => void
}

export function RegistrarComprobanteForm({ vencimientos, onSuccess, onCancel }: Props) {
  const qc = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const { data: tiposComprobante = FALLBACK_TIPOS_COMPROBANTE } = useParametros({
    categorias: ['TIPO_COMPROBANTE'],
    fallback: FALLBACK_TIPOS_COMPROBANTE,
  })

  const cliente = vencimientos[0]?.clientes
  const clienteId = vencimientos[0]?.cliente_id

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_liquidacion: new Date().toISOString().slice(0, 10),
    },
  })

  const tipoComprobante = form.watch('tipo_comprobante')
  const importeRaw = form.watch('importe_liquidado')
  const importeNum = Number(importeRaw) || 0
  const importeFacturado = calcularImporteFacturado(importeNum, tipoComprobante)
  const aplicaIva = tipoComprobante === 'FC_A' && importeFacturado > importeNum

  const onSubmit = async (values: FormValues) => {
    if (!clienteId) return
    setIsPending(true)
    try {
      const detalle = vencimientos.map((v) => v.descripcion).join(' / ')
      const tipoServicio = vencimientos[0]?.tipo_vencimiento ?? 'OTRO'

      const liqResult = await liquidacionesService.create({
        cliente_id: clienteId,
        tipo_servicio: tipoServicio,
        fecha_liquidacion: values.fecha_liquidacion,
        importe_liquidado: Number(values.importe_liquidado),
        tipo_comprobante: values.tipo_comprobante,
        nro_comprobante: values.nro_comprobante,
        detalle,
        notas: values.notas,
      })

      if (!liqResult.ok) {
        toast.error(liqResult.error)
        return
      }

      // Marcar todos los vencimientos como facturados
      await Promise.all(
        vencimientos.map((v) =>
          vencimientosFiscalesService.marcarFacturado(v.id, liqResult.data.id)
        )
      )

      toast.success('Comprobante registrado — se generó el cargo en cuenta corriente')
      qc.invalidateQueries({ queryKey: ['vencimientos-fiscales'] })
      qc.invalidateQueries({ queryKey: ['liquidaciones'] })
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] })
      onSuccess()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Resumen de trabajos */}
      <div className="border-border bg-muted/20 space-y-1 rounded-none border px-3 py-2.5">
        <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
          {cliente?.nombre}
        </p>
        {vencimientos.map((v) => (
          <p key={v.id} className="text-foreground text-xs">
            {v.descripcion}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fecha *"
          type="date"
          {...form.register('fecha_liquidacion')}
          error={form.formState.errors.fecha_liquidacion?.message}
        />
        <Input
          label="Importe (sin IVA) *"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          {...form.register('importe_liquidado')}
          error={form.formState.errors.importe_liquidado?.message}
        />
      </div>

      <Select
        id="tipo_comprobante"
        label="Tipo de comprobante"
        options={tiposComprobante}
        placeholder="Sin comprobante"
        {...form.register('tipo_comprobante')}
      />

      {importeFacturado > 0 && (
        <div className="border-border bg-muted/10 rounded-none border px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total a facturar</span>
            <span className="font-semibold">{formatMoney(importeFacturado)}</span>
          </div>
          {aplicaIva && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Incluye IVA 21% ({formatMoney(importeFacturado - importeNum)})
            </p>
          )}
        </div>
      )}

      <Input
        label="Nro. comprobante"
        placeholder="0001-00001234"
        {...form.register('nro_comprobante')}
      />

      <Input label="Notas" placeholder="Observaciones adicionales..." {...form.register('notas')} />

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Registrar comprobante'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
