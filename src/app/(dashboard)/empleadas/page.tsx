import { PageHeader } from '@/shared/components/layout/PageHeader'
import { LiquidacionPersonalOverview } from '@/modules/empleadas/components/LiquidacionPersonalOverview'
import { EmpleadasPanel } from '@/modules/empleadas/components/EmpleadasPanel'

export default function EmpleadasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidación Personal"
        description="Gestión de sueldos y haberes del personal"
      />

      <div className="rounded-none border border-border bg-surface p-6">
        <h2 className="mb-5 text-base font-semibold">Resumen del período</h2>
        <LiquidacionPersonalOverview />
      </div>

      <div className="rounded-none border border-border bg-surface p-6">
        <EmpleadasPanel />
      </div>
    </div>
  )
}
