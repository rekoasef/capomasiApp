import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ClientesAjustePendiente } from '@/modules/honorarios/components/ClientesAjustePendiente'

export default function HonorariosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Honorarios"
        description="Clientes con ajuste de honorario vencido"
      />
      <ClientesAjustePendiente />
    </div>
  )
}
