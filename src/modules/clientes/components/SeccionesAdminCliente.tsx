'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { HonorariosCliente } from '@/modules/honorarios/components/HonorariosCliente'
import { CuentaCorrienteCliente } from '@/modules/cobranzas/components/CuentaCorrienteCliente'
import { PuntosClienteSection } from './PuntosClienteSection'

type Props = { clienteId: string }

// Honorarios, cuenta corriente y puntos quedan exclusivos de la vista admin en el
// detalle de cliente: cuando una empleada entra a un cliente, la pantalla debe
// mostrar únicamente la sección de claves fiscales (pedido de Paola, 2026-08-14).
export function SeccionesAdminCliente({ clienteId }: Props) {
  const { isAdmin } = useAuth()

  if (!isAdmin) return null

  return (
    <>
      <div className="border-border bg-surface rounded-lg border p-6">
        <HonorariosCliente clienteId={clienteId} />
      </div>
      <div className="border-border bg-surface rounded-lg border p-6">
        <h2 className="mb-4 text-base font-semibold">Cuenta corriente</h2>
        <CuentaCorrienteCliente clienteId={clienteId} />
      </div>
      <div className="border-border bg-surface rounded-lg border p-6">
        <PuntosClienteSection clienteId={clienteId} />
      </div>
    </>
  )
}
