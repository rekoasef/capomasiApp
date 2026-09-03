import type { ParametroOption } from '../hooks/useParametros'
import { FALLBACK_TIPOS_COMPROBANTE, FALLBACK_TIPOS_SERVICIO } from './parametros'

// tipo_servicio / tipo_liquidacion reservado para la deuda anterior al sistema.
// No es un tipo de servicio elegible: no va en FALLBACK_TIPOS_SERVICIO.
export const SALDO_INICIAL = 'SALDO_INICIAL'

function mapaDe(options: ParametroOption[]): Record<string, string> {
  return Object.fromEntries(options.map((o) => [o.value, o.label]))
}

// Código sin etiqueta conocida → texto legible: BIENES_PERSONALES → "Bienes personales"
export function legibleDesdeCodigo(codigo: string): string {
  const limpio = codigo.replace(/_/g, ' ').toLowerCase().trim()
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : ''
}

function etiqueta(value: string | null | undefined, mapa: Record<string, string>): string {
  if (!value) return ''
  return mapa[value] ?? legibleDesdeCodigo(value)
}

const TIPOS_SERVICIO = { ...mapaDe(FALLBACK_TIPOS_SERVICIO), [SALDO_INICIAL]: 'Saldo inicial' }
const TIPOS_COMPROBANTE = mapaDe(FALLBACK_TIPOS_COMPROBANTE)

export function labelTipoServicio(value: string | null | undefined): string {
  return etiqueta(value, TIPOS_SERVICIO)
}

export function labelTipoComprobante(value: string | null | undefined): string {
  return etiqueta(value, TIPOS_COMPROBANTE)
}

/**
 * Identificación del comprobante tal como el cliente la ve en el papel:
 * "FC A 0001-00001234", "Presupuesto P-0100". Vacío si no hay comprobante.
 */
export function descripcionComprobante(
  tipoComprobante: string | null | undefined,
  nroComprobante: string | null | undefined
): string {
  const tipo = labelTipoComprobante(tipoComprobante)
  const nro = nroComprobante?.trim() ?? ''
  if (!tipo) return nro
  return nro ? `${tipo} ${nro}` : tipo
}
