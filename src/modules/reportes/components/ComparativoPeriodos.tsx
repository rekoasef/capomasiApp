'use client'

import { useState } from 'react'
import { useComparativoPeriodos } from '../hooks/useReportes'
import { calcularVariacionPct } from '../services/sumarIngresos'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/shared/utils/formatters'

function primerDiaMes(offsetMeses: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - offsetMeses)
  return d.toISOString().slice(0, 10)
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export function ComparativoPeriodos() {
  const [form, setForm] = useState({
    aDesde: primerDiaMes(1),
    aHasta: hoy(),
    bDesde: primerDiaMes(13),
    bHasta: primerDiaMes(12),
  })
  const [aplicado, setAplicado] = useState(form)

  const { data, isLoading } = useComparativoPeriodos(
    { desde: aplicado.aDesde, hasta: aplicado.aHasta },
    { desde: aplicado.bDesde, hasta: aplicado.bHasta }
  )

  const variacion = data
    ? calcularVariacionPct(data.periodoB.total_liquidado, data.periodoA.total_liquidado)
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="border-border bg-surface border p-4">
          <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
            Período A
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={form.aDesde}
              onChange={(e) => setForm((f) => ({ ...f, aDesde: e.target.value }))}
            />
            <Input
              label="Hasta"
              type="date"
              value={form.aHasta}
              onChange={(e) => setForm((f) => ({ ...f, aHasta: e.target.value }))}
            />
          </div>
        </div>
        <div className="border-border bg-surface border p-4">
          <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
            Período B (comparado contra)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={form.bDesde}
              onChange={(e) => setForm((f) => ({ ...f, bDesde: e.target.value }))}
            />
            <Input
              label="Hasta"
              type="date"
              value={form.bHasta}
              onChange={(e) => setForm((f) => ({ ...f, bHasta: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <Button onClick={() => setAplicado(form)} disabled={isLoading}>
        {isLoading ? 'Calculando…' : 'Comparar'}
      </Button>

      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-border bg-surface border p-5">
            <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-widest uppercase">
              Período A
            </p>
            <p className="text-primary text-2xl font-bold tabular-nums">
              {formatMoney(data.periodoA.total_liquidado)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {data.periodoA.cantidad} liquidaciones
            </p>
          </div>
          <div className="border-border bg-surface border p-5">
            <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-widest uppercase">
              Período B
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatMoney(data.periodoB.total_liquidado)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {data.periodoB.cantidad} liquidaciones
            </p>
          </div>
          <div
            className={`border p-5 ${variacion !== null && variacion >= 0 ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5'}`}
          >
            <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-widest uppercase">
              Variación A vs. B
            </p>
            <p
              className={`text-2xl font-bold tabular-nums ${variacion !== null && variacion >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {variacion === null ? '—' : `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {variacion === null
                ? 'Período B sin ingresos'
                : formatMoney(data.periodoA.total_liquidado - data.periodoB.total_liquidado)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
