'use client'

import { supabase } from '@/lib/supabase/client'
import { ParametroCrudManager } from './ParametroCrudManager'

async function contarUsos(codigo: string): Promise<number> {
  const { count } = await supabase
    .from('claves_clientes')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', codigo)
  return count ?? 0
}

export function TipoClaveManager() {
  return (
    <ParametroCrudManager
      categoria="TIPO_CLAVE"
      queryKey="parametros-tipo-clave"
      title="Tipos de clave fiscal"
      description="Nombres disponibles al cargar claves de un cliente (AFIP, sindicatos, organismos de Santa Fe, etc.)"
      nombreLabel="Nombre del tipo"
      nombrePlaceholder="Ej: API Santa Fe, Sindicato UOM"
      contarUsos={contarUsos}
    />
  )
}
