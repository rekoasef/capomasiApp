'use client'

import { useState } from 'react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { GastosPaolaOverview } from '@/modules/vencimientos/components/GastosPaolaOverview'
import { VencimientosFiscalesOverview } from '@/modules/vencimientos/components/VencimientosFiscalesOverview'

type Tab = 'fiscal' | 'gastos'

export default function VencimientosPage() {
  const [tab, setTab] = useState<Tab>('fiscal')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vencimientos"
        description="Calendario fiscal de clientes y control de gastos"
      />

      <div className="border-border flex gap-0 border-b">
        <button
          onClick={() => setTab('fiscal')}
          className={`-mb-px border-b-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
            tab === 'fiscal'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Calendario Fiscal
        </button>
        <button
          onClick={() => setTab('gastos')}
          className={`-mb-px border-b-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
            tab === 'gastos'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Gastos Paola
        </button>
      </div>

      {tab === 'fiscal' && <VencimientosFiscalesOverview />}
      {tab === 'gastos' && <GastosPaolaOverview />}
    </div>
  )
}
