import type { TLiquidacionConImputaciones, TReciboDisponible } from '../types'

export function filtrarLiquidacionesPorFecha(
  liquidaciones: TLiquidacionConImputaciones[],
  desde?: string,
  hasta?: string
): TLiquidacionConImputaciones[] {
  return liquidaciones.filter((l) => {
    if (desde && l.fecha_liquidacion < desde) return false
    if (hasta && l.fecha_liquidacion > hasta) return false
    return true
  })
}

export function filtrarRecibosPorFecha(
  recibos: TReciboDisponible[],
  desde?: string,
  hasta?: string
): TReciboDisponible[] {
  return recibos.filter((r) => {
    if (desde && r.fecha < desde) return false
    if (hasta && r.fecha > hasta) return false
    return true
  })
}

// Nombre de archivo seguro a partir del nombre del cliente (sin caracteres
// especiales que puedan romper la descarga en distintos sistemas operativos).
export function nombreArchivoCuentaCorriente(clienteNombre: string): string {
  const limpio = clienteNombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca acentos
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${limpio || 'cliente'}_cuenta_corriente.pdf`
}
