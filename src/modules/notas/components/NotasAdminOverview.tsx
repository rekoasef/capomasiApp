'use client'

import { useState } from 'react'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { useNotasEmpleadas, useEliminarNota } from '../hooks/useNotasEmpleadas'
import { NotaForm } from './NotaForm'
import { Button } from '@/shared/components/ui/button'
import { Select } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDate } from '@/shared/utils/formatters'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { TEstadoNota, TNotaEmpleadaConEmpleada } from '../types'

export function NotasAdminOverview() {
  const { data: empleadas = [] } = useEmpleadas()
  const [empleadaId, setEmpleadaId] = useState('')
  const [estado, setEstado] = useState<TEstadoNota>('ACTIVAS')
  const [formNota, setFormNota] = useState<TNotaEmpleadaConEmpleada | 'nueva' | null>(null)
  const [aEliminar, setAEliminar] = useState<TNotaEmpleadaConEmpleada | null>(null)

  const {
    data: notas = [],
    isLoading,
    error,
  } = useNotasEmpleadas({ empleadaId: empleadaId || undefined, estado })
  const eliminar = useEliminarNota()

  const empleadasOptions = empleadas
    .filter((e) => e.activo)
    .map((e) => ({ value: e.id, label: `${e.nombre} ${e.apellido ?? ''}`.trim() }))

  const handleEliminar = async () => {
    if (!aEliminar) return
    const result = await eliminar.mutateAsync(aEliminar.id)
    if (result.ok) setAEliminar(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notas" description="Notas asignadas a cada empleada" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select
            value={empleadaId}
            onChange={(e) => setEmpleadaId(e.target.value)}
            options={empleadasOptions}
            placeholder="Todas las empleadas"
          />
        </div>

        <div className="border-border flex border">
          {(['ACTIVAS', 'FINALIZADAS'] as TEstadoNota[]).map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                estado === e
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {e === 'ACTIVAS' ? 'Activas' : 'Finalizadas'}
            </button>
          ))}
        </div>

        <Button size="sm" className="ml-auto" onClick={() => setFormNota('nueva')}>
          <Plus className="h-3.5 w-3.5" />
          Nueva nota
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !notas.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin notas {estado === 'ACTIVAS' ? 'activas' : 'finalizadas'}
        </p>
      ) : (
        <div className="border-border divide-border divide-y border">
          {notas.map((n) => (
            <div key={n.id} className="bg-surface flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {n.empleadas?.nombre} {n.empleadas?.apellido ?? ''}
                  </span>
                  {n.finalizada && <Badge variant="default">Finalizada</Badge>}
                </div>
                <p className="text-foreground text-sm whitespace-pre-wrap">{n.contenido}</p>
                <p className="text-muted-foreground text-[11px] tabular-nums">
                  Creada {formatDate(n.created_at)}
                  {n.finalizada_at && ` · Finalizada ${formatDate(n.finalizada_at)}`}
                </p>
              </div>
              {!n.finalizada && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    title="Editar"
                    onClick={() => setFormNota(n)}
                    className="text-muted-foreground hover:text-primary p-1 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Eliminar"
                    onClick={() => setAEliminar(n)}
                    className="text-muted-foreground hover:text-danger p-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formNota && (
        <NotaForm
          nota={formNota === 'nueva' ? undefined : formNota}
          empleadaIdInicial={empleadaId || undefined}
          onClose={() => setFormNota(null)}
        />
      )}

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar nota"
        description="La nota se elimina y deja de ser visible para la empleada. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleEliminar}
        onCancel={() => setAEliminar(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
