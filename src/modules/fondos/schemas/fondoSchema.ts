import { z } from 'zod'

export const fondoMovimientoSchema = z.object({
  tipo_movimiento:  z.enum(['INGRESO', 'EGRESO', 'MOVIMIENTO']),
  fecha:            z.string().date(),
  concepto:         z.string().min(2, 'Concepto requerido'),
  nro_comprobante:  z.string().optional().nullable(),
  cuenta_bancaria:  z.string().optional().nullable(),
  importe_banco:    z.number().min(0).default(0),
  importe_efectivo: z.number().min(0).default(0),
  importe_usd:      z.number().min(0).default(0),
}).refine(
  (d) => d.importe_banco > 0 || d.importe_efectivo > 0 || d.importe_usd > 0,
  { message: 'Al menos un importe debe ser mayor a cero' }
)

export type TFondoMovimientoForm = z.infer<typeof fondoMovimientoSchema>
