import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ClientesTable } from '@/modules/clientes/components/ClientesTable'

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Todos los clientes del estudio" />
      <ClientesTable />
    </div>
  )
}
