'use client'

import { useState } from 'react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Select } from '@/shared/components/ui/select'
import { useAniosDisponibles } from '@/modules/reportes/hooks/useReportes'
import { ResumenKpis } from '@/modules/reportes/components/ResumenKpis'
import { SeccionReporte } from '@/modules/reportes/components/SeccionReporte'
import { IngresosMensualesChart } from '@/modules/reportes/components/IngresosMensualesChart'
import { IngresosMensualesTable } from '@/modules/reportes/components/IngresosMensualesTable'
import { IngresosPorTipoChart } from '@/modules/reportes/components/IngresosPorTipoChart'
import { IngresosPorTipoTable } from '@/modules/reportes/components/IngresosPorTipoTable'
import { IngresosPorEmpleadaChart } from '@/modules/reportes/components/IngresosPorEmpleadaChart'
import { IngresosPorEmpleadaTable } from '@/modules/reportes/components/IngresosPorEmpleadaTable'
import { ComparativoPeriodos } from '@/modules/reportes/components/ComparativoPeriodos'

const SIN_ANIOS: number[] = []

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function ReportesPage() {
  const { data: anios = SIN_ANIOS } = useAniosDisponibles()
  const [anio, setAnio] = useState<number>(new Date().getFullYear())
  const [mes, setMes] = useState<number | undefined>(undefined)

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

  const periodo = mes ? `${MESES[mes - 1]} ${anio}` : String(anio)

  return (
    <div className="space-y-8">
      {/* Un solo filtro arriba: alcanza a los tres reportes de abajo, así los
          números siempre concuerdan entre sí. El comparativo tiene sus propios
          rangos porque justamente compara dos períodos distintos. */}
      <PageHeader
        title="Reportes"
        description="Ingresos por período, tipo de servicio y empleada"
        actions={
          <div className="flex gap-2">
            <div className="w-36">
              <Select
                value={mes ? String(mes) : ''}
                onChange={(e) => setMes(e.target.value ? Number(e.target.value) : undefined)}
                options={[
                  { value: '', label: 'Todo el año' },
                  ...MESES.map((m, i) => ({ value: String(i + 1), label: m })),
                ]}
              />
            </div>
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
          </div>
        }
      />

      <ResumenKpis anio={anio} mes={mes} />

      <SeccionReporte
        titulo={`Ingresos mensuales — ${periodo}`}
        nota="Incluye la facturación migrada del Excel hasta agosto de 2026."
        grafico={<IngresosMensualesChart anio={anio} mes={mes} />}
        tabla={<IngresosMensualesTable anio={anio} mes={mes} />}
      />

      <SeccionReporte
        titulo="Por tipo de servicio"
        grafico={<IngresosPorTipoChart anio={anio} mes={mes} />}
        tabla={<IngresosPorTipoTable anio={anio} mes={mes} />}
      />

      <SeccionReporte
        titulo="Por empleada"
        grafico={<IngresosPorEmpleadaChart anio={anio} mes={mes} />}
        tabla={<IngresosPorEmpleadaTable anio={anio} mes={mes} />}
      />

      <section className="space-y-3">
        <div>
          <div className="bg-primary mb-1 h-0.5 w-6" />
          <h2 className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
            Comparativo entre períodos
          </h2>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Elegí uno de los atajos o cargá las fechas a mano. Tiene sus propios rangos porque no
            depende del filtro de arriba.
          </p>
        </div>
        <ComparativoPeriodos />
      </section>
    </div>
  )
}
