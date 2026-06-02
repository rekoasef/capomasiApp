'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDate } from '@/shared/utils/formatters'
import { useCategoriasGastos } from '../hooks/useCategoriasGastos'
import { useProximosVencimientos } from '../hooks/useGastosRecurrentes'
import type { TProximoVencimiento } from '../types'
import { Check, Clock3 } from 'lucide-react'

interface ProximosVencimientosPanelProps {
  onPagar: (vencimiento: TProximoVencimiento) => void
}

function getEstado(vencimiento: TProximoVencimiento): { label: string; variant: 'default' | 'outline' | 'destructive' | 'secondary' } {
  if (vencimiento.dias_restantes < 0) return { label: 'Vencido', variant: 'destructive' }
  if (vencimiento.dias_restantes === 0) return { label: 'Hoy', variant: 'default' }
  if (vencimiento.dias_restantes <= 7) return { label: `${vencimiento.dias_restantes} días`, variant: 'secondary' }
  return { label: `${vencimiento.dias_restantes} días`, variant: 'outline' }
}

export function ProximosVencimientosPanel({ onPagar }: ProximosVencimientosPanelProps) {
  const [categoriaId, setCategoriaId] = useState('TODAS')
  const { data: categorias = [] } = useCategoriasGastos()
  const { data: vencimientos, isLoading, error } = useProximosVencimientos()

  const filtered = useMemo(() => {
    const rows = vencimientos ?? []
    return categoriaId === 'TODAS' ? rows : rows.filter((v) => v.categoria_id === categoriaId)
  }, [categoriaId, vencimientos])

  const groups = useMemo(() => {
    const map = new Map<string, TProximoVencimiento[]>()
    for (const vencimiento of filtered) {
      const key = vencimiento.categoria_nombre
      map.set(key, [...(map.get(key) ?? []), vencimiento])
    }
    return Array.from(map.entries())
  }, [filtered])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-none" />)}
      </div>
    )
  }

  if (error) return <p className="text-sm text-danger">{error.message}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoriaId('TODAS')}
          className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
            categoriaId === 'TODAS' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Todas
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            onClick={() => setCategoriaId(categoria.id)}
            className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              categoriaId === categoria.id ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="h-2 w-2" style={{ backgroundColor: categoria.color ?? 'var(--muted-foreground)' }} />
            {categoria.nombre}
          </button>
        ))}
      </div>

      {!groups.length ? (
        <p className="py-10 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin vencimientos activos</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([categoria, items]) => (
            <section key={categoria} className="space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{categoria}</h2>
              <div className="divide-y divide-border border border-border">
                {items.map((vencimiento) => {
                  const estado = getEstado(vencimiento)
                  return (
                    <div key={vencimiento.gasto_id} className="flex items-center gap-3 bg-surface px-4 py-3 hover:bg-muted/25">
                      <div className="flex size-9 shrink-0 items-center justify-center border border-border">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{vencimiento.descripcion}</span>
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(vencimiento.proxima_fecha_vencimiento)} · día {vencimiento.dia_vencimiento}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onPagar(vencimiento)}>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Marcar pagado
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
