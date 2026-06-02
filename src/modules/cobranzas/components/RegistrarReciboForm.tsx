'use client'

import { useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reciboSchema, type TReciboForm } from '../schemas/reciboSchema'
import {
  calcularImportePagoUSD,
  calcularSaldoPendiente,
} from '../services/calcularSaldo'
import { serieReciboDeTipoComprobante } from '../services/calcularImporteFacturado'
import {
  useRegistrarRecibo,
  useLiquidacionesPendientesCliente,
} from '../hooks/useCobranzas'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_CUENTAS_BANCARIAS,
  FALLBACK_TIPOS_PAGO_COBRANZAS,
} from '@/shared/lib/parametros'

type Props = {
  clienteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function RegistrarReciboForm({ clienteId, onSuccess, onCancel }: Props) {
  const registrar = useRegistrarRecibo(clienteId)
  const { data: pendientes = [] } = useLiquidacionesPendientesCliente(clienteId)
  const { data: tiposPago = FALLBACK_TIPOS_PAGO_COBRANZAS } = useParametros({
    categorias: ['TIPO_PAGO'],
    fallback: FALLBACK_TIPOS_PAGO_COBRANZAS,
  })
  const { data: cuentas = FALLBACK_CUENTAS_BANCARIAS } = useParametros({
    categorias: ['CUENTA_BANCARIA'],
    fallback: FALLBACK_CUENTAS_BANCARIAS,
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TReciboForm>({
    resolver: zodResolver(reciboSchema) as unknown as Resolver<TReciboForm>,
    defaultValues: {
      cliente_id: clienteId,
      tipo_pago: 'TRANSFERENCIA',
      fecha: toLocalDateInputValue(),
      imputaciones: [],
    },
  })

  const tipoPago = watch('tipo_pago')
  const importe = Number(watch('importe') || 0)
  const importeUsd = watch('importe_usd')
  const tipoCambio = watch('tipo_cambio')
  const vuelto = Number(watch('vuelto_efectivo') || 0)
  const importeArs =
    tipoPago === 'USD' && importeUsd && tipoCambio
      ? calcularImportePagoUSD(Number(importeUsd), Number(tipoCambio))
      : null

  const [imputaciones, setImputaciones] = useState<Map<string, number>>(new Map())

  const totalImputado = Array.from(imputaciones.values()).reduce((acc, v) => acc + v, 0)
  const saldoFavor = Math.max(0, Math.round((importe - totalImputado + Number.EPSILON) * 100) / 100)
  const exceso = totalImputado > importe + 0.001

  // Calcular series implicadas por las imputaciones actuales
  const seriesInfo = useMemo(() => {
    let totalA = 0
    let totalC = 0
    pendientes.forEach((liq) => {
      const imp = imputaciones.get(liq.id) ?? 0
      if (imp <= 0) return
      const serie = serieReciboDeTipoComprobante(liq.tipo_comprobante)
      if (serie === 'A') totalA += imp
      else totalC += imp
    })
    return { totalA, totalC, mixto: totalA > 0 && totalC > 0 }
  }, [imputaciones, pendientes])

  function setImputacion(liquidacionId: string, valor: number) {
    setImputaciones((prev) => {
      const next = new Map(prev)
      if (!valor || valor <= 0) {
        next.delete(liquidacionId)
      } else {
        next.set(liquidacionId, valor)
      }
      const arr = Array.from(next.entries()).map(([liquidacion_id, imp]) => ({
        liquidacion_id,
        importe: imp,
      }))
      setValue('imputaciones', arr, { shouldValidate: false })
      return next
    })
  }

  function autoImputar() {
    if (!importe || importe <= 0) return
    const next = new Map<string, number>()
    let restante = importe
    for (const liq of pendientes) {
      if (restante <= 0) break
      const saldo = calcularSaldoPendiente(liq.importe_liquidado, [])
      const aImputar = Math.min(saldo, restante)
      if (aImputar > 0) {
        next.set(liq.id, Math.round((aImputar + Number.EPSILON) * 100) / 100)
        restante = Math.round((restante - aImputar + Number.EPSILON) * 100) / 100
      }
    }
    setImputaciones(next)
    const arr = Array.from(next.entries()).map(([liquidacion_id, imp]) => ({
      liquidacion_id,
      importe: imp,
    }))
    setValue('imputaciones', arr, { shouldValidate: false })
  }

  async function onSubmit(data: TReciboForm) {
    const result = await registrar.mutateAsync(data)
    if (result.ok) {
      reset()
      setImputaciones(new Map())
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('cliente_id')} />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="tipo_pago"
          label="Tipo de pago *"
          options={tiposPago}
          error={errors.tipo_pago?.message}
          disabled={registrar.isPending}
          {...register('tipo_pago')}
        />
        <Input
          id="fecha"
          label="Fecha *"
          type="date"
          error={errors.fecha?.message}
          disabled={registrar.isPending}
          {...register('fecha')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="importe"
          label="Importe ARS *"
          type="number"
          step="0.01"
          min="0.01"
          error={errors.importe?.message}
          disabled={registrar.isPending}
          {...register('importe')}
        />
        <div>
          <Input
            id="numero_recibo_placeholder"
            label="N° de recibo"
            placeholder="Se asigna al guardar"
            disabled
            readOnly
          />
          <p className="mt-1 text-xs text-muted-foreground">
            El sistema asigna serie A o C según el comprobante imputado
          </p>
        </div>
      </div>

      {tipoPago === 'TRANSFERENCIA' && (
        <Select
          id="cuenta_bancaria"
          label="Cuenta bancaria"
          options={cuentas}
          placeholder="Seleccionar cuenta"
          error={errors.cuenta_bancaria?.message}
          disabled={registrar.isPending}
          {...register('cuenta_bancaria')}
        />
      )}

      {tipoPago === 'USD' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="importe_usd"
            label="Importe USD *"
            type="number"
            step="0.01"
            min="0.01"
            error={errors.importe_usd?.message}
            disabled={registrar.isPending}
            {...register('importe_usd')}
          />
          <div>
            <Input
              id="tipo_cambio"
              label="Tipo de cambio *"
              type="number"
              step="0.01"
              min="0.01"
              error={errors.tipo_cambio?.message}
              disabled={registrar.isPending}
              {...register('tipo_cambio')}
            />
            {importeArs !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                = {formatMoney(importeArs)}
              </p>
            )}
          </div>
        </div>
      )}

      {tipoPago === 'CHEQUE' && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="cheque_numero"
              label="Número de cheque *"
              error={errors.cheque_numero?.message}
              disabled={registrar.isPending}
              {...register('cheque_numero')}
            />
            <Input
              id="cheque_banco"
              label="Banco *"
              error={errors.cheque_banco?.message}
              disabled={registrar.isPending}
              {...register('cheque_banco')}
            />
          </div>
          <Input
            id="cheque_fecha_cobro"
            label="Fecha de cobro"
            type="date"
            disabled={registrar.isPending}
            {...register('cheque_fecha_cobro')}
          />
          <div>
            <Input
              id="vuelto_efectivo"
              label="Vuelto en efectivo (opcional)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              error={errors.vuelto_efectivo?.message}
              disabled={registrar.isPending}
              {...register('vuelto_efectivo')}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Si el cliente entrega un cheque por FC A y recibe vuelto en efectivo, ingresá el vuelto acá. El sistema generará un recibo A por el cheque y un recibo C por el efectivo.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Imputación a facturas pendientes</h3>
          {pendientes.length > 0 && importe > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={autoImputar}>
              Auto-imputar
            </Button>
          )}
        </div>

        {pendientes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No hay liquidaciones pendientes. El recibo quedará como saldo a favor (serie C).
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {pendientes.map((liq) => {
              const valor = imputaciones.get(liq.id) ?? 0
              const serie = serieReciboDeTipoComprobante(liq.tipo_comprobante)
              return (
                <div key={liq.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{liq.tipo_servicio}</span>
                      <Badge variant={serie === 'A' ? 'default' : 'secondary'} className="text-[10px]">
                        Serie {serie}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(liq.fecha_liquidacion)} · {formatMoney(liq.importe_liquidado)}
                      {liq.nro_comprobante ? ` · ${liq.nro_comprobante}` : ''}
                    </p>
                  </div>
                  <Input
                    id={`imp_${liq.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-32"
                    value={valor || ''}
                    onChange={(e) => setImputacion(liq.id, Number(e.target.value))}
                    disabled={registrar.isPending}
                  />
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted-foreground">
            Imputado: <span className="font-semibold text-foreground">{formatMoney(totalImputado)}</span>
          </span>
          {saldoFavor > 0 && !exceso && (
            <span className="text-success">
              Saldo a favor: <span className="font-semibold">{formatMoney(saldoFavor)}</span>
            </span>
          )}
          {exceso && (
            <span className="text-danger font-semibold">
              Exceso: {formatMoney(totalImputado - importe)}
            </span>
          )}
        </div>

        {(seriesInfo.mixto || vuelto > 0) && (
          <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs text-foreground">
            {vuelto > 0 ? (
              <>
                <strong>Cheque + vuelto:</strong> se generarán 2 recibos — uno serie A por el cheque ({formatMoney(importe - vuelto)}) y uno serie C por el vuelto en efectivo ({formatMoney(vuelto)}).
              </>
            ) : (
              <>
                <strong>Pago mixto:</strong> hay imputaciones a Factura A ({formatMoney(seriesInfo.totalA)}) y a otras series ({formatMoney(seriesInfo.totalC)}). El sistema generará 2 recibos separados (uno serie A y uno serie C).
              </>
            )}
          </div>
        )}
      </div>

      <Textarea
        id="notas"
        label="Notas (opcional)"
        disabled={registrar.isPending}
        {...register('notas')}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={registrar.isPending || exceso}>
          {registrar.isPending ? 'Registrando...' : 'Registrar recibo'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={registrar.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
