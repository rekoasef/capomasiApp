'use client'

import { useMemo, useState } from 'react'
import { useTrabajosCompletados } from '../hooks/useVencimientosFiscales'
import { useClientes } from '@/modules/clientes/hooks/useClientes'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { useParametros } from '@/shared/hooks/useParametros'
import { Select } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PaginationControls } from '@/shared/components/PaginationControls'
import { formatDate } from '@/shared/utils/formatters'
import { CheckCircle2 } from 'lucide-react'

const PAGE_SIZE = 25

type FiltroFacturacion = 'TODOS' | 'FACTURADO' | 'FALTA_FACTURAR' | 'ABONO'

const FACTURACION_OPTIONS: { value: FiltroFacturacion; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'FACTURADO', label: 'Facturado' },
  { value: 'FALTA_FACTURAR', label: 'Falta facturar' },
  { value: 'ABONO', label: 'Incluido en abono' },
]

function estadoFacturacion(v: { facturado: boolean; facturar_aparte: boolean | null }) {
  if (v.facturado) return { label: 'Facturado', variant: 'default' as const }
  if (v.facturar_aparte) return { label: 'Falta facturar', variant: 'destructive' as const }
  return { label: 'Incluido en abono', variant: 'secondary' as const }
}

export function TrabajosCompletadosView() {
  const [clienteId, setClienteId] = useState('')
  const [empleadaId, setEmpleadaId] = useState('')
  const [tipoVencimiento, setTipoVencimiento] = useState('')
  const [facturacion, setFacturacion] = useState<FiltroFacturacion>('TODOS')
  const [page, setPage] = useState(0)

  const { data: clientes = [] } = useClientes()
  const { data: empleadas = [] } = useEmpleadas()
  const { data: tipos = [] } = useParametros({ categorias: ['TIPO_SERVICIO', 'TIPO_VENCIMIENTO'] })

  const {
    data: resultado,
    isLoading,
    error,
  } = useTrabajosCompletados({
    clienteId: clienteId || undefined,
    empleadaId: empleadaId || undefined,
    tipoVencimiento: tipoVencimiento || undefined,
    facturacion: facturacion === 'TODOS' ? undefined : facturacion,
    page,
    pageSize: PAGE_SIZE,
  })

  const data = resultado?.rows ?? []
  const total = resultado?.total ?? 0

  const tipoOptions = useMemo(() => {
    const vistos = new Map<string, string>()
    for (const t of tipos) vistos.set(t.value, t.label)
    return [...vistos.entries()].map(([value, label]) => ({ value, label }))
  }, [tipos])

  const clienteOptions = clientes.map((c) => ({ value: c.id, label: c.nombre }))
  const empleadaOptions = empleadas
    .filter((e) => e.activo)
    .map((e) => ({ value: e.id, label: `${e.nombre}${e.apellido ? ' ' + e.apellido : ''}` }))

  const withReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v)
      setPage(0)
    }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select
            id="filtro_cliente"
            label="Cliente"
            options={clienteOptions}
            placeholder="Todos"
            value={clienteId}
            onChange={(e) => withReset(setClienteId)(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            id="filtro_empleada"
            label="Empleada"
            options={empleadaOptions}
            placeholder="Todas"
            value={empleadaId}
            onChange={(e) => withReset(setEmpleadaId)(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            id="filtro_tipo"
            label="Tipo de trabajo"
            options={tipoOptions}
            placeholder="Todos"
            value={tipoVencimiento}
            onChange={(e) => withReset(setTipoVencimiento)(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            id="filtro_facturacion"
            label="Facturación"
            options={FACTURACION_OPTIONS}
            value={facturacion}
            onChange={(e) => withReset(setFacturacion)(e.target.value as FiltroFacturacion)}
          />
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !data.length ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle2 className="text-success h-8 w-8" />
          <p className="text-sm font-semibold">Sin trabajos completados</p>
          <p className="text-muted-foreground text-xs">
            Acá aparecen todos los trabajos aprobados, con o sin factura aparte.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {total} trabajo{total !== 1 ? 's' : ''} completado{total !== 1 ? 's' : ''}
          </p>
          <div className="border-border divide-border divide-y border">
            {data.map((v) => {
              const estado = estadoFacturacion(v)
              return (
                <div
                  key={v.id}
                  className="bg-surface hover:bg-muted/20 flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{v.clientes?.nombre ?? '—'}</span>
                      <span className="text-muted-foreground text-xs">{v.descripcion}</span>
                      {v.empleadas && (
                        <span className="border-border text-muted-foreground border px-1.5 py-0.5 text-[10px]">
                          {v.empleadas.nombre}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {formatDate(v.fecha_vencimiento)}
                    </span>
                  </div>
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                </div>
              )
            })}
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
