'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useFacturacionHistorica } from '../hooks/useFacturacionHistorica'
import { DataTable, type Column } from '@/shared/components/DataTable'
import { Select } from '@/shared/components/ui/select'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import type { TFacturacionHistorica } from '../types'

export function FacturacionHistoricaTable() {
  const { data: registros = [], isLoading, error } = useFacturacionHistorica()

  const [search, setSearch] = useState('')
  const [servicio, setServicio] = useState('')
  const [generadoPor, setGeneradoPor] = useState('')
  const [anio, setAnio] = useState('')

  const opciones = useMemo(() => {
    const servicios = new Set<string>()
    const generadoPorSet = new Set<string>()
    const anios = new Set<number>()
    for (const r of registros) {
      if (r.servicio) servicios.add(r.servicio)
      if (r.generado_por) generadoPorSet.add(r.generado_por)
      if (r.anio_liquidado) anios.add(r.anio_liquidado)
    }
    return {
      servicios: [...servicios].sort().map((v) => ({ value: v, label: v })),
      generadoPor: [...generadoPorSet].sort().map((v) => ({ value: v, label: v })),
      anios: [...anios].sort((a, b) => b - a).map((v) => ({ value: String(v), label: String(v) })),
    }
  }, [registros])

  const filtrados = registros.filter((r) => {
    if (search.trim() && !r.cliente.toLowerCase().includes(search.trim().toLowerCase())) {
      return false
    }
    if (servicio && r.servicio !== servicio) return false
    if (generadoPor && r.generado_por !== generadoPor) return false
    if (anio && String(r.anio_liquidado) !== anio) return false
    return true
  })

  const columns: Column<TFacturacionHistorica>[] = [
    {
      key: 'fecha_liquidacion',
      header: 'Fecha liquidación',
      render: (r) => (r.fecha_liquidacion ? formatDate(r.fecha_liquidacion) : '—'),
    },
    { key: 'cliente', header: 'Cliente' },
    { key: 'servicio', header: 'Servicio' },
    { key: 'generado_por', header: 'Generado por' },
    { key: 'periodo_liquidado', header: 'Período' },
    { key: 'anio_liquidado', header: 'Año' },
    { key: 'detalle', header: 'Detalle' },
    {
      key: 'importe_liquidado',
      header: 'Importe liquidado',
      numeric: true,
      render: (r) => (r.importe_liquidado != null ? formatMoney(r.importe_liquidado) : '—'),
    },
    { key: 'comprobante_tipo', header: 'Comprobante' },
    { key: 'comprobante_numero', header: 'Nº' },
    { key: 'comprobante_emisor', header: 'Emisor' },
    {
      key: 'importe_facturado',
      header: 'Importe facturado',
      numeric: true,
      render: (r) => (r.importe_facturado != null ? formatMoney(r.importe_facturado) : '—'),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-surface focus:ring-primary w-full border py-2 pr-3 pl-9 text-sm outline-none focus:ring-1"
          />
        </div>
        <Select
          value={servicio}
          onChange={(e) => setServicio(e.target.value)}
          options={opciones.servicios}
          placeholder="Todos los servicios"
        />
        <Select
          value={generadoPor}
          onChange={(e) => setGeneradoPor(e.target.value)}
          options={opciones.generadoPor}
          placeholder="Todas las empleadas"
        />
        <Select
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          options={opciones.anios}
          placeholder="Todos los años"
        />
      </div>

      {error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {filtrados.length} de {registros.length} registros
          </p>
          <DataTable
            columns={columns}
            data={filtrados}
            isLoading={isLoading}
            emptyMessage="Sin registros para estos filtros"
          />
        </>
      )}
    </div>
  )
}
