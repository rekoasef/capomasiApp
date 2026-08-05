export type TFacturacionHistorica = {
  id: string
  fecha_liquidacion: string | null
  cliente: string
  servicio: string | null
  generado_por: string | null
  periodo_liquidado: string | null
  anio_liquidado: number | null
  detalle: string | null
  importe_liquidado: number | null
  comprobante_tipo: string | null
  comprobante_numero: string | null
  comprobante_emisor: string | null
  importe_facturado: number | null
  created_at: string
}
