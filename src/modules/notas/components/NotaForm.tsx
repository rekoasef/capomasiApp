'use client'

import { useState } from 'react'
import { useEmpleadas } from '@/modules/empleadas/hooks/useEmpleadas'
import { useCrearNota, useEditarNota } from '../hooks/useNotasEmpleadas'
import { Button } from '@/shared/components/ui/button'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import type { TNotaEmpleadaConEmpleada } from '../types'

type Props = {
  nota?: TNotaEmpleadaConEmpleada
  empleadaIdInicial?: string
  onClose: () => void
}

export function NotaForm({ nota, empleadaIdInicial, onClose }: Props) {
  const esEdicion = !!nota
  const { data: empleadas = [] } = useEmpleadas()
  const crear = useCrearNota()
  const editar = useEditarNota()

  const [empleadaId, setEmpleadaId] = useState(nota?.empleada_id ?? empleadaIdInicial ?? '')
  const [contenido, setContenido] = useState(nota?.contenido ?? '')
  const [error, setError] = useState<string | null>(null)

  const pending = crear.isPending || editar.isPending

  const handleGuardar = async () => {
    setError(null)
    const result = esEdicion
      ? await editar.mutateAsync({ id: nota.id, contenido })
      : await crear.mutateAsync({ empleada_id: empleadaId, contenido })

    if (result.ok) {
      onClose()
      return
    }
    setError(result.error)
  }

  const empleadasOptions = empleadas
    .filter((e) => e.activo)
    .map((e) => ({ value: e.id, label: `${e.nombre} ${e.apellido ?? ''}`.trim() }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]" onClick={onClose} />
      <div className="border-border bg-surface relative z-10 w-full max-w-sm border p-6 shadow-xl">
        <div className="bg-primary mb-1 h-0.5 w-6" />
        <h2 className="mb-4 text-sm font-bold">{esEdicion ? 'Editar nota' : 'Nueva nota'}</h2>

        <div className="space-y-4">
          {esEdicion ? (
            <p className="text-muted-foreground text-xs">
              Para{' '}
              <span className="text-foreground font-semibold">
                {nota.empleadas?.nombre} {nota.empleadas?.apellido ?? ''}
              </span>
            </p>
          ) : (
            <Select
              label="Empleada"
              value={empleadaId}
              onChange={(e) => setEmpleadaId(e.target.value)}
              options={empleadasOptions}
              placeholder="Seleccionar empleada"
            />
          )}

          <Textarea
            label="Nota"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={4}
            placeholder="Escribí la nota para la empleada..."
          />

          {error && <p className="text-danger text-xs">{error}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            size="sm"
            disabled={pending || !contenido.trim() || (!esEdicion && !empleadaId)}
            onClick={handleGuardar}
          >
            {pending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
