'use client'

import { useState } from 'react'
import { useResumenPeriodo } from '../hooks/useEmpleadas'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatMoney } from '@/shared/utils/formatters'
import Link from 'next/link'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function LiquidacionPersonalOverview() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes,  setMes]  = useState(hoy.getMonth() + 1)
  const { data, isLoading, error } = useResumenPeriodo(anio, mes)

  const ANIOS = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - i)

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Año</span>
          <div className="flex gap-1">
            {ANIOS.map((a) => (
              <button
                key={a}
                onClick={() => setAnio(a)}
                className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                  a === anio
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Mes</span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="border border-border bg-surface px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-px">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}</div>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : !data?.length ? (
        <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin empleadas</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Empleada</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Haberes</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Descuentos</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Neto</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Pagado</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {data.map((r, i) => (
                <tr key={r.empleada_id} className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/empleadas/${r.empleada_id}`} className="font-medium text-primary hover:underline">
                      {r.empleada_nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.total_haberes)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-danger">{formatMoney(r.total_descuentos)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatMoney(r.neto)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.total_pagado)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${r.saldo > 0 ? 'text-danger' : 'text-success'}`}>
                    {formatMoney(r.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
