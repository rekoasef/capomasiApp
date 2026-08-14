'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ClavesCliente } from './ClavesCliente'
import { useAuth } from '@/lib/auth/useAuth'
import { useUsuarios } from '@/modules/auth/hooks/useUsuarios'
import { formatCuit } from '@/shared/utils/formatters'
import type { TCliente } from '../types'

type Props = { cliente: TCliente }

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export function ClienteDetalle({ cliente }: Props) {
  const { isAdmin } = useAuth()
  const { data: usuarios = [] } = useUsuarios()
  const responsable = usuarios.find((u) => u.id === cliente.responsable_id)

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="border-border bg-surface rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Información general</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clientes/${cliente.id}/editar`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoRow label="CUIT" value={formatCuit(cliente.cuit)} />
            <InfoRow label="Localidad" value={cliente.localidad} />
            <InfoRow label="Domicilio" value={cliente.domicilio} />
            <InfoRow label="Teléfono" value={cliente.telefono} />
            <InfoRow label="Email" value={cliente.email} />
            <InfoRow label="Responsable" value={responsable?.nombre} />
            {cliente.notas && (
              <div className="col-span-full">
                <p className="text-muted-foreground text-xs">Notas</p>
                <p className="text-sm">{cliente.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-border bg-surface rounded-lg border p-6">
        <ClavesCliente clienteId={cliente.id} />
      </div>
    </div>
  )
}
