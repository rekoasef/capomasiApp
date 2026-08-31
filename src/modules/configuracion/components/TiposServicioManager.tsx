'use client'

import { supabase } from '@/lib/supabase/client'
import { ParametroCrudManager } from './ParametroCrudManager'

async function contarUsos(codigo: string): Promise<number> {
  const { count } = await supabase
    .from('liquidaciones')
    .select('id', { count: 'exact', head: true })
    .eq('tipo_servicio', codigo)
  return count ?? 0
}

export function TiposServicioManager() {
  return (
    <ParametroCrudManager
      categoria="TIPO_SERVICIO"
      queryKey="parametros-tipo-servicio"
      title="Tipos de trabajo"
      description="Lista maestra de trabajos realizados en el estudio"
      nombreLabel="Nombre del trabajo"
      nombrePlaceholder="Ej: Ganancias Persona Jurídica"
      contarUsos={contarUsos}
    />
  )
}
