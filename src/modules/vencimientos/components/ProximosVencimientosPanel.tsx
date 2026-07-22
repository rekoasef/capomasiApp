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

type AmbitoFiltro = 'TODOS' | 'PERSONAL' | 'ESTUDIO'

const AMBITO_TABS: { value: AmbitoFiltro; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'ESTUDIO', label: 'Estudio' },
]

function getEstado(vencimiento: TProximoVencimiento): {
  label: string
  variant: 'default' | 'outline' | 'destructive' | 'secondary'
} {
  if (vencimiento.dias_restantes < 0) return { label: 'Vencido', variant: 'destructive' }
  if (vencimiento.dias_restantes === 0) return { label: 'Hoy', variant: 'default' }
  if (vencimiento.dias_restantes <= 7)
    return { label: `${vencimiento.dias_restantes} días`, variant: 'secondary' }
  return { label: `${vencimiento.dias_restantes} días`, variant: 'outline' }
}

export function ProximosVencimientosPanel({ onPagar }: ProximosVencimientosPanelProps) {
  const [ambito, setAmbito] = useState<AmbitoFiltro>('TODOS')
  const [categoriaId, setCategoriaId] = useState('TODAS')
  const { data: categorias = [] } = useCategoriasGastos()
  const { data: vencimientos, isLoading, error } = useProximosVencimientos()

  const categoriasFiltro = useMemo(
    () => (ambito === 'TODOS' ? categorias : categorias.filter((c) => c.ambito === ambito)),
    [ambito, categorias]
  )

  const filtered = useMemo(() => {
    const rows = vencimientos ?? []
    return rows
      .filter((v) => ambito === 'TODOS' || v.categoria_ambito === ambito)
      .filter((v) => categoriaId === 'TODAS' || v.categoria_id === categoriaId)
  }, [ambito, categoriaId, vencimientos])

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
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-danger text-sm">{error.message}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        {AMBITO_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setAmbito(t.value)
              setCategoriaId('TODAS')
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoriaId('TODAS')}
          className={`border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase ${
            categoriaId === 'TODAS'
              ? 'border-primary text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Todas
        </button>
        {categoriasFiltro.map((categoria) => (
          <button
            key={categoria.id}
            onClick={() => setCategoriaId(categoria.id)}
            className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase ${
              categoriaId === categoria.id
                ? 'border-primary text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className="h-2 w-2"
              style={{ backgroundColor: categoria.color ?? 'var(--muted-foreground)' }}
            />
            {categoria.nombre}
          </button>
        ))}
      </div>

      {!groups.length ? (
        <p className="text-muted-foreground py-10 text-center text-xs tracking-widest uppercase">
          Sin vencimientos activos
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([categoria, items]) => (
            <section key={categoria} className="space-y-2">
              <h2 className="text-muted-foreground text-[11px] font-bold tracking-[0.16em] uppercase">
                {categoria}
              </h2>
              <div className="divide-border border-border divide-y border">
                {items.map((vencimiento) => {
                  const estado = getEstado(vencimiento)
                  return (
                    <div
                      key={vencimiento.gasto_id}
                      className="bg-surface hover:bg-muted/25 flex items-center gap-3 px-4 py-3"
                    >
                      <div className="border-border flex size-9 shrink-0 items-center justify-center border">
                        <Clock3 className="text-muted-foreground h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{vencimiento.descripcion}</span>
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(vencimiento.proxima_fecha_vencimiento)} · día{' '}
                          {vencimiento.dia_vencimiento}
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
