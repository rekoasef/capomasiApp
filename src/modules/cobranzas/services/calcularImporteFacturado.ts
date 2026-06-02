const IVA = 0.21

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function calcularImporteFacturado(
  importeLiquidado: number,
  tipoComprobante: string | null | undefined,
): number {
  if (!Number.isFinite(importeLiquidado) || importeLiquidado <= 0) return 0
  if (tipoComprobante === 'FC_A') {
    return round2(importeLiquidado * (1 + IVA))
  }
  return round2(importeLiquidado)
}

export function serieReciboDeTipoComprobante(
  tipoComprobante: string | null | undefined,
): 'A' | 'C' {
  return tipoComprobante === 'FC_A' ? 'A' : 'C'
}
