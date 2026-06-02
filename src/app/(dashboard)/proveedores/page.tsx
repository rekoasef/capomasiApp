import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ProveedoresOverview } from '@/modules/proveedores/components/ProveedoresOverview'

export default function ProveedoresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores y Gastos"
        description="Gestión de compras, gastos y pagos a proveedores"
      />

      <div className="border border-border bg-surface p-6">
        <ProveedoresOverview />
      </div>
    </div>
  )
}
