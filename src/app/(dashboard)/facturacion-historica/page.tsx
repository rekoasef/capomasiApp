import { PageHeader } from '@/shared/components/layout/PageHeader'
import { FacturacionHistoricaTable } from '@/modules/facturacion-historica/components/FacturacionHistoricaTable'

export default function FacturacionHistoricaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturación Histórica"
        description="Datos informativos migrados del Excel anterior — no impacta la cuenta corriente ni la facturación actual"
      />

      <div className="border-border bg-surface border p-6">
        <FacturacionHistoricaTable />
      </div>
    </div>
  )
}
