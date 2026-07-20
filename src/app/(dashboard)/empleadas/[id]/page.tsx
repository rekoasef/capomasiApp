import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { EmpleadaDetalle } from '@/modules/empleadas/components/EmpleadaDetalle'

export default async function EmpleadaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: empleada, error } = await supabase
    .from('empleadas')
    .select('id, nombre, apellido, tipo_relacion, tipo_comision')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !empleada) notFound()

  const nombreCompleto = [empleada.nombre, empleada.apellido].filter(Boolean).join(' ')
  const tipoLabel =
    empleada.tipo_relacion === 'DEPENDENCIA' ? 'Relación de dependencia' : 'Por hora'

  return (
    <div className="space-y-6">
      <PageHeader title={nombreCompleto} description={tipoLabel} />
      <EmpleadaDetalle empleadaId={id} />
    </div>
  )
}
