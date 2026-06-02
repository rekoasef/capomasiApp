import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ClienteForm } from '@/modules/clientes/components/ClienteForm'

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
      <PageHeader title="Editar cliente" description={cliente.nombre} />
      <ClienteForm cliente={cliente} />
    </div>
  )
}
