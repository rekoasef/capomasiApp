import { PageHeader } from '@/shared/components/layout/PageHeader'
import { FondosOverview } from '@/modules/fondos/components/FondosOverview'
import { ChequesTable } from '@/modules/fondos/components/ChequesTable'

export default function FondosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fondos y Cheques"
        description="Control de caja: ingresos, egresos, saldos por moneda"
      />

      <div className="border border-border bg-surface p-6">
        <FondosOverview />
      </div>

      <div className="border border-border bg-surface p-6">
        <h2 className="mb-5 text-base font-semibold">Cheques en cartera</h2>
        <ChequesTable />
      </div>
    </div>
  )
}
