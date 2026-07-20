'use client'

import { useMemo, useState } from 'react'
import { useColaFacturacionVencimientos } from '../hooks/useVencimientosFiscales'
import { RegistrarComprobanteForm } from './RegistrarComprobanteForm'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { formatDate } from '@/shared/utils/formatters'
import { Receipt, CheckCircle2 } from 'lucide-react'
import type { TVencimientoFiscalConCliente } from '../types'

export function ColaFacturacionOverview() {
  const { data = [], isLoading, error } = useColaFacturacionVencimientos()
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [facturando, setFacturando] = useState<TVencimientoFiscalConCliente[] | null>(null)

  // Agrupar por cliente
  const porCliente = useMemo(() => {
    const mapa = new Map<string, { nombre: string; items: TVencimientoFiscalConCliente[] }>()
    for (const v of data) {
      const cid = v.cliente_id ?? '__sin_cliente__'
      if (!mapa.has(cid)) {
        mapa.set(cid, { nombre: v.clientes?.nombre ?? '—', items: [] })
      }
      mapa.get(cid)!.items.push(v)
    }
    return [...mapa.entries()]
  }, [data])

  const toggleItem = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCliente = (items: TVencimientoFiscalConCliente[]) => {
    const ids = items.map((i) => i.id)
    const todosMarcados = ids.every((id) => seleccionados.has(id))
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (todosMarcados) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const handleFacturar = () => {
    if (seleccionados.size === 0) return
    const items = data.filter((v) => seleccionados.has(v.id))
    // Verificar que sean todos del mismo cliente
    const clienteIds = new Set(items.map((v) => v.cliente_id))
    if (clienteIds.size > 1) {
      alert('Solo podés facturar trabajos del mismo cliente en un comprobante.')
      return
    }
    setFacturando(items)
  }

  if (isLoading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-danger text-sm">{error.message}</p>

  if (!data.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <CheckCircle2 className="text-success h-8 w-8" />
        <p className="text-sm font-semibold">Sin pendientes de facturar</p>
        <p className="text-muted-foreground text-xs">
          Los trabajos completados aparecen acá cuando estén listos para facturar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {data.length} trabajo{data.length !== 1 ? 's' : ''} pendiente
          {data.length !== 1 ? 's' : ''} de facturar
        </p>
        {seleccionados.size > 0 && (
          <Button size="sm" onClick={handleFacturar}>
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Facturar seleccionados ({seleccionados.size})
          </Button>
        )}
      </div>

      {/* Lista agrupada por cliente */}
      <div className="space-y-4">
        {porCliente.map(([clienteId, { nombre, items }]) => {
          const todosMarcados = items.every((i) => seleccionados.has(i.id))
          return (
            <div key={clienteId} className="border-border border">
              {/* Header del cliente */}
              <div
                className="border-border bg-muted/40 flex cursor-pointer items-center gap-3 border-b px-4 py-2.5"
                onClick={() => toggleCliente(items)}
              >
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={() => toggleCliente(items)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-primary h-3.5 w-3.5"
                />
                <span className="text-sm font-semibold">{nombre}</span>
                <span className="text-muted-foreground ml-auto text-[10px]">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items del cliente */}
              <div className="divide-border divide-y">
                {items.map((v) => (
                  <div
                    key={v.id}
                    className="bg-surface hover:bg-muted/20 flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors"
                    onClick={() => toggleItem(v.id)}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.has(v.id)}
                      onChange={() => toggleItem(v.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-primary h-3.5 w-3.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{v.descripcion}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Vencimiento: {formatDate(v.fecha_vencimiento)}
                        {v.empleadas && ` · ${v.empleadas.nombre}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón rápido facturar cliente completo */}
              {!todosMarcados && (
                <div className="border-border bg-muted/10 border-t px-4 py-2">
                  <button
                    className="text-primary text-[11px] font-medium hover:underline"
                    onClick={() => {
                      toggleCliente(items)
                      setTimeout(() => setFacturando(items), 50)
                    }}
                  >
                    Facturar todos los trabajos de {nombre}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal registro de comprobante */}
      {facturando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={() => {
              setFacturando(null)
              setSeleccionados(new Set())
            }}
          />
          <div className="border-border bg-surface relative z-10 w-full max-w-md border p-6 shadow-xl">
            <div className="bg-primary mb-1 h-0.5 w-6" />
            <h2 className="mb-4 text-sm font-bold">Registrar comprobante</h2>
            <RegistrarComprobanteForm
              vencimientos={facturando}
              onSuccess={() => {
                setFacturando(null)
                setSeleccionados(new Set())
              }}
              onCancel={() => setFacturando(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
