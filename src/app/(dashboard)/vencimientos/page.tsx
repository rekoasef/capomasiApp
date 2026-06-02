'use client'

import { PageHeader } from '@/shared/components/layout/PageHeader'
import { GastosPaolaOverview } from '@/modules/vencimientos/components/GastosPaolaOverview'

export default function VencimientosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vencimientos"
        description="Control de gastos de Paola"
      />

      <GastosPaolaOverview />
    </div>
  )
}
