'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PaginationControls } from '@/shared/components/PaginationControls'
import { formatDate, formatMoney } from '@/shared/utils/formatters'
import { useCategoriasGastos } from '../hooks/useCategoriasGastos'
import { useGastosRecurrentes } from '../hooks/useGastosRecurrentes'
import { useHistorialPagosGastos, useResumenAnualGastos } from '../hooks/usePagosGastos'
import { MEDIOS_PAGO_GASTO, type TPagoGastoDetalle, type TPagosGastosFilters } from '../types'
import { RegistrarPagoForm } from './RegistrarPagoForm'
import { ResumenCategoria } from './ResumenCategoria'
import { GastosPieChart } from './GastosPieChart'
import { Edit2, ExternalLink } from 'lucide-react'

const PAGE_SIZE = 25

type AmbitoFiltro = 'TODOS' | 'PERSONAL' | 'ESTUDIO'

const AMBITO_TABS: { value: AmbitoFiltro; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'ESTUDIO', label: 'Estudio' },
]

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
  const [ambito, setAmbito] = useState<AmbitoFiltro>('TODOS')
  const [anio, setAnio] = useState(currentYear)
  const [mes, setMes] = useState<number | 'TODOS'>('TODOS')
  const [categoriaId, setCategoriaId] = useState('TODAS')
  const [gastoId, setGastoId] = useState('TODOS')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<TPagoGastoDetalle | null>(null)

  const { data: categorias = [] } = useCategoriasGastos({ includeInactive: true })
  const { data: gastos = [] } = useGastosRecurrentes({ includeInactive: true })

  const categoriasFiltro = useMemo(
    () => (ambito === 'TODOS' ? categorias : categorias.filter((c) => c.ambito === ambito)),
    [ambito, categorias]
  )

  const filters = useMemo<TPagosGastosFilters & { page: number; pageSize: number }>(
    () => ({
      anio,
      mes: mes === 'TODOS' ? undefined : mes,
      categoriaId: categoriaId === 'TODAS' ? undefined : categoriaId,
      gastoRecurrenteId: gastoId === 'TODOS' ? undefined : gastoId,
      ambito: ambito === 'TODOS' ? undefined : ambito,
      page,
      pageSize: PAGE_SIZE,
    }),
    [ambito, anio, categoriaId, gastoId, mes, page]
  )

  const resumenFilters = useMemo(
    () => ({
      categoriaId: categoriaId === 'TODAS' ? undefined : categoriaId,
      gastoRecurrenteId: gastoId === 'TODOS' ? undefined : gastoId,
      ambito: ambito === 'TODOS' ? undefined : ambito,
    }),
    [ambito, categoriaId, gastoId]
  )

  const { data: historial, isLoading, error } = useHistorialPagosGastos(filters)
  const pagos = historial?.rows
  const { data: resumen } = useResumenAnualGastos(anio, resumenFilters)
  const totalFiltrado = resumen?.total ?? 0
  const anios = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1">
        {AMBITO_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setAmbito(t.value)
              setCategoriaId('TODAS')
              setPage(0)
            }}
            className={`border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
              ambito === t.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="border-border bg-muted/20 flex flex-wrap items-center gap-2 border p-3">
        <select
          value={anio}
          onChange={(e) => {
            setAnio(Number(e.target.value))
            setPage(0)
          }}
          className="border-border bg-surface focus:ring-primary border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
        >
          {anios.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={mes}
          onChange={(e) => {
            setMes(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))
            setPage(0)
          }}
          className="border-border bg-surface focus:ring-primary border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
        >
          <option value="TODOS">Todo el año</option>
          {MESES.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value)
            setPage(0)
          }}
          className="border-border bg-surface focus:ring-primary border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
        >
          <option value="TODAS">Todas las categorías</option>
          {categoriasFiltro.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
        <select
          value={gastoId}
          onChange={(e) => {
            setGastoId(e.target.value)
            setPage(0)
          }}
          className="border-border bg-surface focus:ring-primary border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
        >
          <option value="TODOS">Todos los gastos</option>
          {gastos.map((gasto) => (
            <option key={gasto.id} value={gasto.id}>
              {gasto.descripcion}
            </option>
          ))}
        </select>
        <div className="ml-auto text-right">
          <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Total filtrado
          </p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(totalFiltrado)}</p>
        </div>
      </div>

      {resumen && (
        <div className="space-y-4">
          <ResumenCategoria items={resumen.porCategoria} />
          <GastosPieChart items={resumen.porCategoria} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !pagos?.length ? (
        <p className="text-muted-foreground py-10 text-center text-xs tracking-widest uppercase">
          Sin pagos registrados
        </p>
      ) : (
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b-2">
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Fecha
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Concepto
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Categoría
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Medio
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                  Importe
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {pagos.map((pago) => (
                <tr key={pago.id} className="hover:bg-muted/25">
                  <td className="text-muted-foreground px-4 py-3">{formatDate(pago.fecha_pago)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{pago.concepto}</div>
                    {pago.fecha_vencimiento_pagado && (
                      <div className="text-muted-foreground text-[11px]">
                        Vencía {formatDate(pago.fecha_vencimiento_pagado)}
                      </div>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    <span
                      className="mr-2 inline-block h-2 w-2"
                      style={{ backgroundColor: pago.categoria_color ?? 'var(--muted-foreground)' }}
                    />
                    {pago.categoria_nombre}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {MEDIOS_PAGO_GASTO.find((m) => m.value === pago.medio_pago)?.label ??
                        pago.medio_pago}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(Number(pago.importe))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {pago.comprobante_url && (
                        <a
                          href={pago.comprobante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground p-1.5"
                          title="Abrir comprobante"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(pago)}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground p-1.5"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            total={historial?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={() => setEditing(null)}
          />
          <div className="border-border bg-surface relative z-10 w-full max-w-md border p-5 shadow-xl">
            <h2 className="mb-4 text-sm font-bold">Editar pago</h2>
            <RegistrarPagoForm
              pago={editing}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
