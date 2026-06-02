'use client'

import { useState } from 'react'
import {
  useRecibosDisponiblesCliente,
  useImputar,
} from '../hooks/useCobranzas'
import {
  calcularSaldoPendiente,
  calcularTotalImputado,
} from '../services/calcularSaldo'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import type { TLiquidacionConImputaciones } from '../types'

const TIPO_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transf.',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  USD: 'USD',
}

type Props = {
  liquidacion: TLiquidacionConImputaciones
  clienteId: string
  onClose: () => void
}

export function ImputarRecibosModal({ liquidacion, clienteId, onClose }: Props) {
  const { data: disponibles = [], isLoading } = useRecibosDisponiblesCliente(clienteId)
  const imputar = useImputar(clienteId)

  const imputado = calcularTotalImputado(liquidacion.imputaciones)
  const saldoLiq = calcularSaldoPendiente(liquidacion.importe_liquidado, liquidacion.imputaciones)

  const [seleccion, setSeleccion] = useState<Map<string, number>>(new Map())

  function setMonto(reciboId: string, valor: number) {
    setSeleccion((prev) => {
      const next = new Map(prev)
      if (!valor || valor <= 0) next.delete(reciboId)
      else next.set(reciboId, valor)
      return next
    })
  }

  async function handleConfirmar() {
    for (const [reciboId, monto] of seleccion.entries()) {
      const result = await imputar.mutateAsync({
        recibo_id: reciboId,
        liquidacion_id: liquidacion.id,
        importe: monto,
      })
      if (!result.ok) return
    }
    onClose()
  }

  const totalSeleccionado = Array.from(seleccion.values()).reduce((acc, v) => acc + v, 0)
  const exceso = totalSeleccionado > saldoLiq + 0.001

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Imputar recibos a la liquidación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {liquidacion.tipo_servicio} · {formatDate(liquidacion.fecha_liquidacion)} ·{' '}
            <span className="font-medium text-foreground">{formatMoney(liquidacion.importe_liquidado)}</span>
            {imputado > 0 && (
              <> · ya imputado: <span className="text-success">{formatMoney(imputado)}</span></>
            )}
            {' · '}saldo: <span className="font-semibold text-danger">{formatMoney(saldoLiq)}</span>
          </p>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando recibos…</p>
        ) : disponibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Este cliente no tiene recibos disponibles para imputar.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {disponibles.map((rec) => {
              const valor = seleccion.get(rec.id) ?? 0
              const max = Math.min(rec.saldo_libre, saldoLiq)
              return (
                <div key={rec.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">
                      {rec.numero_recibo ? `${rec.numero_recibo} · ` : ''}
                      {formatDate(rec.fecha)} · {TIPO_LABEL[rec.tipo_pago]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Importe {formatMoney(rec.importe)} · libre{' '}
                      <span className="font-semibold text-success">{formatMoney(rec.saldo_libre)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      id={`imp_${rec.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max={max}
                      placeholder="0"
                      className="w-32"
                      value={valor || ''}
                      onChange={(e) => setMonto(rec.id, Number(e.target.value))}
                      disabled={imputar.isPending}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setMonto(rec.id, max)}
                      disabled={imputar.isPending}
                    >
                      Max
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            A imputar:{' '}
            <span className="font-semibold text-foreground">{formatMoney(totalSeleccionado)}</span>
          </span>
          {exceso && (
            <span className="font-semibold text-danger">
              Excede el saldo de la liquidación
            </span>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={imputar.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmar}
            disabled={imputar.isPending || seleccion.size === 0 || exceso}
          >
            {imputar.isPending ? 'Imputando...' : 'Confirmar imputación'}
          </Button>
        </div>
      </div>
    </div>
  )
}
