'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useHonorariosConAjustePendiente } from '../hooks/useHonorarios'
import { AplicarAjusteForm } from './AplicarAjusteForm'
import { DataTable } from '@/shared/components/DataTable'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { formatMoney, formatDate, formatCuit } from '@/shared/utils/formatters'
import type { THonorarioConCliente } from '../types'

export function ClientesAjustePendiente() {
  const router = useRouter()
  const { data: pendientes = [], isLoading } = useHonorariosConAjustePendiente()
  const [expanded, setExpanded] = useState<string | null>(null)

  const columns = [
    {
      key: 'cliente',
      header: 'Cliente',
      render: ({ honorario }: { honorario: THonorarioConCliente; mesesTranscurridos: number }) => (
        <div>
          <p className="font-medium">{honorario.clientes.nombre}</p>
          <p className="text-muted-foreground font-mono text-xs">
            {formatCuit(honorario.clientes.cuit)}
          </p>
        </div>
      ),
    },
    {
      key: 'monto',
      header: 'Honorario actual',
      render: ({ honorario }: { honorario: THonorarioConCliente; mesesTranscurridos: number }) => (
        <span className="font-semibold">{formatMoney(honorario.monto)}</span>
      ),
    },
    {
      key: 'vigente_desde',
      header: 'Vigente desde',
      render: ({ honorario }: { honorario: THonorarioConCliente; mesesTranscurridos: number }) =>
        formatDate(honorario.vigente_desde),
    },
    {
      key: 'meses',
      header: 'Vencimiento',
      render: ({
        honorario,
        mesesTranscurridos,
      }: {
        honorario: THonorarioConCliente
        mesesTranscurridos: number
      }) => (
        <Badge variant="destructive">
          {mesesTranscurridos}m / {honorario.frecuencia_ajuste_meses}m
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      className: 'text-right w-32',
      render: ({ honorario }: { honorario: THonorarioConCliente; mesesTranscurridos: number }) => (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => (v === honorario.cliente_id ? null : honorario.cliente_id))
          }}
        >
          {expanded === honorario.cliente_id ? 'Cerrar' : 'Ajustar'}
        </Button>
      ),
    },
  ]

  // DataTable necesita { id: string } — mapeo id al cliente_id
  const rows = pendientes.map(({ honorario, mesesTranscurridos }) => ({
    id: honorario.cliente_id,
    honorario,
    mesesTranscurridos,
  }))

  return (
    <div className="space-y-4">
      {!isLoading && !pendientes.length ? (
        <div className="border-border text-muted-foreground flex h-40 items-center justify-center rounded-md border text-sm">
          No hay clientes con ajuste pendiente
        </div>
      ) : (
        <>
          {!isLoading && (
            <div className="text-warning flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {pendientes.length} cliente{pendientes.length !== 1 ? 's' : ''} con ajuste vencido
            </div>
          )}
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyMessage="Sin ajustes pendientes"
            onRowClick={({ honorario }) => router.push(`/clientes/${honorario.cliente_id}`)}
          />
          {expanded && (
            <div className="border-border bg-muted/20 rounded-md border p-4">
              <h3 className="mb-3 text-sm font-semibold">Aplicar ajuste</h3>
              <AplicarAjusteForm
                clienteId={expanded}
                montoActual={
                  pendientes.find((p) => p.honorario.cliente_id === expanded)?.honorario.monto ?? 0
                }
                onSuccess={() => setExpanded(null)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
