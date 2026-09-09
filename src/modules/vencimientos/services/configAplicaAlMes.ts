// ¿Una configuración de trabajo recurrente genera un vencimiento en este mes?
//
// Vive en su propio archivo, sin tocar Supabase, para poder testearla sola:
// es la regla que hacía que los anticipos le aparecieran a Paola pendientes
// los 12 meses del año. Hasta la migración 0076 un trabajo recurrente solo
// podía ser MENSUAL (los 12, sin excepción) o ANUAL (uno solo), y los
// anticipos son 5 al año en persona física y 9 en sociedades.

export type TConfigRecurrencia = {
  tipo_vencimiento: string
  mes_vencimiento_anual: number | null
  meses_vencimiento: number[] | null
}

export function configAplicaAlMes(config: TConfigRecurrencia, mes: number): boolean {
  if (config.tipo_vencimiento === 'MENSUAL') return true
  if (config.tipo_vencimiento === 'ANUAL') return config.mes_vencimiento_anual === mes
  if (config.tipo_vencimiento === 'MESES_ESPECIFICOS')
    return (config.meses_vencimiento ?? []).includes(mes)
  return false
}
