'use client'

import { useState } from 'react'
import { useLiquidacionesCliente, useImputar } from '../hooks/useCobranzas'
import { calcularSaldoPendiente, calcularTotalImputado } from '../services/calcularSaldo'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import type { TReciboDisponible } from '../types'
import { descripcionComprobante, labelTipoServicio } from '@/shared/lib/etiquetas'

type Props = {
  recibo: TReciboDisponible
  clienteId: string
  onClose: () => void
}

export function ImputarDesdeReciboModal({ recibo, clienteId, onClose }: Props) {
  const { data: todasLiquidaciones = [] } = useLiquidacionesCliente(clienteId)
  const imputar = useImputar(clienteId)
  const [seleccion, setSeleccion] = useState<Map<string, number>>(new Map())
  const [isPending, setIsPending] = useState(false)

  const pendientes = todasLiquidaciones.filter(
    (l) => l.estado !== 'COBRADA' && l.estado !== 'ANULADA'
  )

  const saldoLibre = recibo.saldo_libre ?? 0
  const totalSeleccionado = Array.from(seleccion.values()).reduce((a, v) => a + v, 0)
  const saldoRestante = Math.max(0, Math.round((saldoLibre - totalSeleccionado) * 100) / 100)
  const exceso = totalSeleccionado > saldoLibre + 0.001

  function setMonto(liqId: string, valor: number) {
    setSeleccion((prev) => {
      const next = new Map(prev)
      if (!valor || valor <= 0) next.delete(liqId)
      else next.set(liqId, valor)
      return next
    })
  }

  function autoImputar() {
    const next = new Map<string, number>()
    let restante = saldoLibre
    for (const liq of pendientes) {
      if (restante <= 0) break
      const saldoLiq = calcularSaldoPendiente(
        liq.importe_liquidado,
        liq.imputaciones,
        liq.importe_facturado
      )
      const aImputar = Math.round(Math.min(saldoLiq, restante) * 100) / 100
      if (aImputar > 0) {
        next.set(liq.id, aImputar)
        restante = Math.round((restante - aImputar) * 100) / 100
      }
    }
    setSeleccion(next)
  }

  async function handleConfirmar() {
    if (seleccion.size === 0 || exceso) return
    setIsPending(true)
    try {
      for (const [liquidacion_id, monto] of seleccion.entries()) {
        const result = await imputar.mutateAsync({
          recibo_id: recibo.id,
          liquidacion_id,
          importe: monto,
        })
        if (!result.ok) return
      }
      onClose()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="border-border bg-surface relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Imputar recibo a liquidaciones</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {recibo.numero_recibo && (
              <span className="text-foreground font-medium">{recibo.numero_recibo} · </span>
            )}
            {formatDate(recibo.fecha ?? '')} · {formatMoney(recibo.importe ?? 0)} total ·{' '}
            <span className="text-success font-semibold">{formatMoney(saldoLibre)} disponible</span>
          </p>
        </div>

        {pendientes.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No hay liquidaciones pendientes para este cliente.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-xs">
                Seleccioná las liquidaciones que cubre este recibo e ingresá el importe a aplicar.
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={autoImputar}
                disabled={isPending}
              >
                Auto-imputar
              </Button>
            </div>

            <div className="border-border max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
              {pendientes.map((liq) => {
                const saldoLiq = calcularSaldoPendiente(
                  liq.importe_liquidado,
                  liq.imputaciones,
                  liq.importe_facturado
                )
                const totalImputado = calcularTotalImputado(liq.imputaciones)
                const valor = seleccion.get(liq.id) ?? 0
                const comprobante = descripcionComprobante(
                  liq.tipo_comprobante,
                  liq.nro_comprobante
                )
                const maxParaEste =
                  Math.round(Math.min(saldoLiq, saldoLibre - totalSeleccionado + valor) * 100) / 100

                return (
                  <div key={liq.id} className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">
                          {labelTipoServicio(liq.tipo_servicio)}
                        </span>
                        {comprobante && (
                          <span className="text-muted-foreground shrink-0 text-[10px]">
                            {comprobante}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(liq.fecha_liquidacion)} ·{' '}
                        <span className="text-foreground font-medium">
                          {formatMoney(liq.importe_facturado ?? liq.importe_liquidado)}
                        </span>
                        {totalImputado > 0 && <> · pagado {formatMoney(totalImputado)}</>}
                        {' · '}saldo{' '}
                        <span className="text-danger font-semibold">{formatMoney(saldoLiq)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Input
                        id={`imp_${liq.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxParaEste}
                        placeholder="0"
                        className="w-32"
                        value={valor || ''}
                        onChange={(e) => setMonto(liq.id, Number(e.target.value))}
                        disabled={isPending}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setMonto(liq.id, maxParaEste)}
                        disabled={isPending || maxParaEste <= 0}
                      >
                        Max
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex gap-3">
            <span className="text-muted-foreground">
              A imputar:{' '}
              <span className="text-foreground font-semibold">
                {formatMoney(totalSeleccionado)}
              </span>
            </span>
            {saldoRestante > 0 && !exceso && totalSeleccionado > 0 && (
              <span className="text-muted-foreground">
                Queda libre:{' '}
                <span className="text-warning font-semibold">{formatMoney(saldoRestante)}</span>
              </span>
            )}
          </div>
          {exceso && (
            <span className="text-danger font-semibold">Excede el saldo disponible del recibo</span>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmar}
            disabled={isPending || seleccion.size === 0 || exceso}
          >
            {isPending
              ? 'Imputando...'
              : `Confirmar${seleccion.size > 0 ? ` (${seleccion.size})` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
