import { PageHeader } from '@/shared/components/layout/PageHeader'
import { SaldosDeudores } from '@/modules/cobranzas/components/SaldosDeudores'

export default function CobranzasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranzas"
        description="Clientes con saldo pendiente"
      />
      <div className="rounded-lg border border-border bg-surface p-6">
        <SaldosDeudores />
      </div>
    </div>
  )
}
