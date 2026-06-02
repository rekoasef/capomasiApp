'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ClavesCliente } from './ClavesCliente'
import { useAuth } from '@/lib/auth/useAuth'
import { formatCuit } from '@/shared/utils/formatters'
import type { TCliente } from '../types'

type Props = { cliente: TCliente }

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export function ClienteDetalle({ cliente }: Props) {
  const { isAdmin } = useAuth()

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Información general</h2>
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clientes/${cliente.id}/editar`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="CUIT" value={formatCuit(cliente.cuit)} />
          <InfoRow label="Localidad" value={cliente.localidad} />
          <InfoRow label="Domicilio" value={cliente.domicilio} />
          <InfoRow label="Teléfono" value={cliente.telefono} />
          <InfoRow label="Email" value={cliente.email} />
          {cliente.notas && (
            <div className="col-span-full">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm">{cliente.notas}</p>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <ClavesCliente clienteId={cliente.id} />
        </div>
      )}
    </div>
  )
}
