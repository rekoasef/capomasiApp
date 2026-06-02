'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate, formatMoney } from '@/shared/utils/formatters'
import { useCategoriasGastos } from '../hooks/useCategoriasGastos'
import { useGastosRecurrentes } from '../hooks/useGastosRecurrentes'
import { useHistorialPagosGastos, useResumenAnualGastos } from '../hooks/usePagosGastos'
import { MEDIOS_PAGO_GASTO, type TPagoGastoDetalle, type TPagosGastosFilters } from '../types'
import { RegistrarPagoForm } from './RegistrarPagoForm'
import { ResumenCategoria } from './ResumenCategoria'
import { Edit2, ExternalLink } from 'lucide-react'

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
]

const currentYear = new Date().getFullYear()

export function HistorialPagos() {
  const [anio, setAnio] = useState(currentYear)
  const [mes, setMes] = useState<number | 'TODOS'>('TODOS')
  const [categoriaId, setCategoriaId] = useState('TODAS')
  const [gastoId, setGastoId] = useState('TODOS')
  const [editing, setEditing] = useState<TPagoGastoDetalle | null>(null)

  const { data: categorias = [] } = useCategoriasGastos({ includeInactive: true })
  const { data: gastos = [] } = useGastosRecurrentes({ includeInactive: true })

  const filters = useMemo<TPagosGastosFilters>(() => ({
    anio,
    mes: mes === 'TODOS' ? undefined : mes,
    categoriaId: categoriaId === 'TODAS' ? undefined : categoriaId,
    gastoRecurrenteId: gastoId === 'TODOS' ? undefined : gastoId,
  }), [anio, categoriaId, gastoId, mes])

  const resumenFilters = useMemo(() => ({
    categoriaId: categoriaId === 'TODAS' ? undefined : categoriaId,
    gastoRecurrenteId: gastoId === 'TODOS' ? undefined : gastoId,
  }), [categoriaId, gastoId])

  const { data: pagos, isLoading, error } = useHistorialPagosGastos(filters)
  const { data: resumen } = useResumenAnualGastos(anio, resumenFilters)
  const totalFiltrado = pagos?.reduce((sum, pago) => sum + Number(pago.importe), 0) ?? 0
  const anios = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          {anios.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={mes} onChange={(e) => setMes(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))} className="border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="TODOS">Todo el año</option>
          {MESES.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
        </select>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="TODAS">Todas las categorías</option>
          {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
        </select>
        <select value={gastoId} onChange={(e) => setGastoId(e.target.value)} className="border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="TODOS">Todos los gastos</option>
          {gastos.map((gasto) => <option key={gasto.id} value={gasto.id}>{gasto.descripcion}</option>)}
        </select>
        <span className="ml-auto text-sm font-semibold tabular-nums">{formatMoney(totalFiltrado)}</span>
      </div>

      {resumen && <ResumenCategoria items={resumen.porCategoria} />}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : !pagos?.length ? (
        <p className="py-10 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin pagos registrados</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Fecha</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Concepto</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Categoría</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Medio</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Importe</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {pagos.map((pago) => (
                <tr key={pago.id} className="hover:bg-muted/25">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(pago.fecha_pago)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{pago.concepto}</div>
                    {pago.fecha_vencimiento_pagado && (
                      <div className="text-[11px] text-muted-foreground">Vencía {formatDate(pago.fecha_vencimiento_pagado)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="mr-2 inline-block h-2 w-2" style={{ backgroundColor: pago.categoria_color ?? 'var(--muted-foreground)' }} />
                    {pago.categoria_nombre}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{MEDIOS_PAGO_GASTO.find((m) => m.value === pago.medio_pago)?.label ?? pago.medio_pago}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(Number(pago.importe))}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {pago.comprobante_url && (
                        <a href={pago.comprobante_url} target="_blank" rel="noreferrer" className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Abrir comprobante">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button type="button" onClick={() => setEditing(pago)} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={() => setEditing(null)} />
          <div className="relative z-10 w-full max-w-md border border-border bg-surface p-5 shadow-xl">
            <h2 className="mb-4 text-sm font-bold">Editar pago</h2>
            <RegistrarPagoForm pago={editing} onCancel={() => setEditing(null)} onSaved={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
