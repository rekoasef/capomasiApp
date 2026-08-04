import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ClienteDetalle } from '@/modules/clientes/components/ClienteDetalle'
import { HonorariosCliente } from '@/modules/honorarios/components/HonorariosCliente'
import { CuentaCorrienteCliente } from '@/modules/cobranzas/components/CuentaCorrienteCliente'
import { PuntosClienteSection } from '@/modules/clientes/components/PuntosClienteSection'

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!cliente) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={cliente.nombre} description={`CUIT: ${cliente.cuit}`} />
      <ClienteDetalle cliente={cliente} />
      <div className="border-border bg-surface rounded-lg border p-6">
        <HonorariosCliente clienteId={id} />
      </div>
      <div className="border-border bg-surface rounded-lg border p-6">
        <h2 className="mb-4 text-base font-semibold">Cuenta corriente</h2>
        <CuentaCorrienteCliente clienteId={id} />
      </div>
      <div className="border-border bg-surface rounded-lg border p-6">
        <PuntosClienteSection clienteId={id} />
      </div>
    </div>
  )
}
