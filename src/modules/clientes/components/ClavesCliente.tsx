'use client'

import { useState } from 'react'
import { Eye, EyeOff, Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useClavesCliente, useGuardarClave, useEliminarClave } from '../hooks/useClientes'
import { claveSchema, type TClaveForm } from '../schemas/claveSchema'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import type { TClave } from '../types'

const TIPOS_CLAVE = [
  { value: 'AFIP', label: 'AFIP' },
  { value: 'ANSES', label: 'ANSES' },
  { value: 'ARBA', label: 'ARBA' },
  { value: 'SINDICATO', label: 'Sindicato' },
  { value: 'BANCO', label: 'Banco' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'RENTAS', label: 'Rentas' },
  { value: 'OTROS', label: 'Otros' },
]

type Props = { clienteId: string }

export function ClavesCliente({ clienteId }: Props) {
  const { data: claves = [], isLoading } = useClavesCliente(clienteId)
  const guardar = useGuardarClave(clienteId)
  const eliminar = useEliminarClave(clienteId)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TClave | null>(null)
  const [toDelete, setToDelete] = useState<TClave | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TClaveForm>({ resolver: zodResolver(claveSchema) })

  function openNew() {
    reset({ tipo: '', usuario: '', clave: '', notas: '' })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(clave: TClave) {
    reset({ tipo: clave.tipo, usuario: clave.usuario ?? '', clave: clave.clave, notas: clave.notas ?? '' })
    setEditing(clave)
    setShowForm(true)
  }

  async function onSubmit(data: TClaveForm) {
    const result = await guardar.mutateAsync(data)
    if (result.ok) { setShowForm(false); reset() }
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Claves fiscales</h3>
        </div>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !claves.length ? (
        <p className="text-sm text-muted-foreground">Sin claves cargadas.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {claves.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{c.tipo}</p>
                {c.usuario && <p className="text-xs text-muted-foreground">Usuario: {c.usuario}</p>}
                <div className="flex items-center gap-1.5">
                  <p className="font-mono text-sm">
                    {revealed.has(c.id) ? c.clave : '••••••••'}
                  </p>
                  <button
                    onClick={() => toggleReveal(c.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title={revealed.has(c.id) ? 'Ocultar' : 'Mostrar'}
                  >
                    {revealed.has(c.id)
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setToDelete(c)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <h4 className="mb-4 text-sm font-semibold">
            {editing ? 'Editar clave' : 'Nueva clave'}
          </h4>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Select
              id="tipo"
              label="Tipo *"
              options={TIPOS_CLAVE}
              placeholder="Seleccioná un tipo"
              error={errors.tipo?.message}
              disabled={guardar.isPending}
              {...register('tipo')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="usuario"
                label="Usuario"
                placeholder="usuario@afip.gov.ar"
                disabled={guardar.isPending}
                {...register('usuario')}
              />
              <Input
                id="clave"
                label="Clave *"
                type="text"
                placeholder="contraseña"
                error={errors.clave?.message}
                disabled={guardar.isPending}
                {...register('clave')}
              />
            </div>
            <Textarea
              id="notas"
              label="Notas"
              placeholder="Observaciones..."
              disabled={guardar.isPending}
              {...register('notas')}
            />
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowForm(false); reset() }}
                disabled={guardar.isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar clave"
        description={`¿Eliminás la clave de ${toDelete?.tipo}?`}
        confirmLabel="Eliminar"
        onConfirm={async () => { await eliminar.mutateAsync(toDelete!.id); setToDelete(null) }}
        onCancel={() => setToDelete(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
