import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ClienteDetalle } from '@/modules/clientes/components/ClienteDetalle'
import { SeccionesAdminCliente } from '@/modules/clientes/components/SeccionesAdminCliente'

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
      <SeccionesAdminCliente clienteId={id} />
    </div>
  )
}
