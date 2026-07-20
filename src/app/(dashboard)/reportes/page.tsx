'use client'

import { useState } from 'react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Select } from '@/shared/components/ui/select'
import { useAniosDisponibles } from '@/modules/reportes/hooks/useReportes'
import { IngresosMensualesTable } from '@/modules/reportes/components/IngresosMensualesTable'
import { IngresosPorTipoTable } from '@/modules/reportes/components/IngresosPorTipoTable'
import { IngresosPorEmpleadaTable } from '@/modules/reportes/components/IngresosPorEmpleadaTable'
import { TrabajosAnualesCobradosCard } from '@/modules/reportes/components/TrabajosAnualesCobradosCard'
import { ComparativoPeriodos } from '@/modules/reportes/components/ComparativoPeriodos'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-primary mb-1 h-0.5 w-6" />
      <h2 className="text-muted-foreground mb-4 text-xs font-bold tracking-widest uppercase">
        {children}
      </h2>
    </div>
  )
}

const SIN_ANIOS: number[] = []

export default function ReportesPage() {
  const { data: anios = SIN_ANIOS } = useAniosDisponibles()
  const [anio, setAnio] = useState<number>(new Date().getFullYear())

  // Ajuste de estado durante el render (evita el setState síncrono en un efecto).
  // anios debe ser una referencia estable cuando no cambia — por eso el
  // fallback es una constante de módulo (SIN_ANIOS) y no un array literal
  // inline, que crearía una referencia nueva en cada render y provocaría
  // un loop infinito de renders.
  const [prevAnios, setPrevAnios] = useState(anios)
  if (anios !== prevAnios) {
    setPrevAnios(anios)
    if (anios.length && !anios.includes(anio)) setAnio(anios[0])
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportes"
        description="Ingresos por período, tipo de servicio y empleada"
        actions={
          <div className="w-32">
            <Select
              value={String(anio)}
              onChange={(e) => setAnio(Number(e.target.value))}
              options={(anios.length ? anios : [anio]).map((a) => ({
                value: String(a),
                label: String(a),
              }))}
            />
          </div>
        }
      />

      <section>
        <SectionTitle>Ingresos mensuales — {anio}</SectionTitle>
        <IngresosMensualesTable anio={anio} />
      </section>

      <section>
        <SectionTitle>Por tipo de servicio</SectionTitle>
        <IngresosPorTipoTable anio={anio} />
      </section>

      <section>
        <SectionTitle>Por empleada</SectionTitle>
        <IngresosPorEmpleadaTable anio={anio} />
      </section>

      <section>
        <SectionTitle>Trabajos anuales</SectionTitle>
        <TrabajosAnualesCobradosCard anio={anio} />
      </section>

      <section>
        <SectionTitle>Comparativo entre períodos</SectionTitle>
        <ComparativoPeriodos />
      </section>
    </div>
  )
}
