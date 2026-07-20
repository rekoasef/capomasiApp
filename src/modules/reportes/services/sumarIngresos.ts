export type TLiquidacionIngreso = {
  importe_liquidado: number
  importe_facturado: number | null
}

export function sumarIngresos(rows: TLiquidacionIngreso[]) {
  return rows.reduce(
    (acc, r) => ({
      cantidad: acc.cantidad + 1,
      total_liquidado: acc.total_liquidado + r.importe_liquidado,
      total_facturado: acc.total_facturado + (r.importe_facturado ?? r.importe_liquidado),
    }),
    { cantidad: 0, total_liquidado: 0, total_facturado: 0 }
  )
}

export function calcularVariacionPct(base: number, comparado: number): number | null {
  if (base === 0) return null
  return ((comparado - base) / base) * 100
}
