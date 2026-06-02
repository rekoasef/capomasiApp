import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ClienteForm } from '@/modules/clientes/components/ClienteForm'

export default function NuevoClientePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo cliente" description="Completá los datos del cliente" />
      <ClienteForm />
    </div>
  )
}
