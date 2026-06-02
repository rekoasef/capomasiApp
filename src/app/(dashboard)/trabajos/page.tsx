import { PageHeader } from '@/shared/components/layout/PageHeader'
import { TrabajosRealizadosOverview } from '@/modules/empleadas/components/TrabajosRealizadosOverview'

export default function TrabajosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planilla de Trabajos"
        description="Carga mensual de trabajos realizados, aprobación y comisiones"
      />
      <div className="rounded-none border border-border bg-surface p-6">
        <TrabajosRealizadosOverview />
      </div>
    </div>
  )
}
