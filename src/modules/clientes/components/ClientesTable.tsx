'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useClientes, useEliminarCliente } from '../hooks/useClientes'
import { DataTable } from '@/shared/components/DataTable'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { useAuth } from '@/lib/auth/useAuth'
import { formatCuit } from '@/shared/utils/formatters'
import type { TCliente } from '../types'

export function ClientesTable() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { data: clientes = [], isLoading } = useClientes()
  const eliminar = useEliminarCliente()

  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<TCliente | null>(null)

  const filtered = search.trim()
    ? clientes.filter(
        (c) =>
          c.nombre.toLowerCase().includes(search.toLowerCase()) ||
          c.cuit.includes(search) ||
          (c.localidad ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : clientes

  async function handleDelete() {
    if (!toDelete) return
    await eliminar.mutateAsync(toDelete.id)
    setToDelete(null)
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre / Razón Social',
      render: (c: TCliente) => (
        <span className="font-medium text-foreground">{c.nombre}</span>
      ),
    },
    {
      key: 'cuit',
      header: 'CUIT',
      render: (c: TCliente) => (
        <span className="font-mono text-muted-foreground">{formatCuit(c.cuit)}</span>
      ),
    },
    { key: 'localidad', header: 'Localidad' },
    {
      key: 'activo',
      header: 'Estado',
      render: (c: TCliente) => (
        <Badge variant={c.activo ? 'default' : 'secondary'}>
          {c.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'acciones',
            header: '',
            className: 'w-24 text-right',
            render: (c: TCliente) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); router.push(`/clientes/${c.id}/editar`) }}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); setToDelete(c) }}
                  title="Eliminar"
                  className="text-danger hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, CUIT o localidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => router.push('/clientes/nuevo')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo cliente
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage={search ? 'Sin resultados para esa búsqueda' : 'No hay clientes cargados'}
        onRowClick={(c) => router.push(`/clientes/${c.id}`)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar cliente"
        description={`¿Confirmás que querés eliminar a "${toDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        isPending={eliminar.isPending}
      />
    </div>
  )
}
