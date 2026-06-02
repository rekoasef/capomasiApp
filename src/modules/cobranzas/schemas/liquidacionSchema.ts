import { z } from 'zod'

export const liquidacionSchema = z.object({
  cliente_id: z.string().uuid('Cliente requerido'),
  tipo_servicio: z.string().min(1, 'Tipo de servicio requerido'),
  generado_por: z.string().optional(),
  fecha_liquidacion: z.string().min(1, 'Fecha requerida'),
  periodo_mes: z.string().optional(),
  periodo_anio: z.coerce.number().int().min(2020).max(2100).optional(),
  detalle: z.string().optional(),
  importe_liquidado: z.coerce
    .number()
    .positive('El importe debe ser mayor a 0'),
  tipo_comprobante: z.string().optional(),
  nro_comprobante: z.string().optional(),
  // importe_facturado se calcula automáticamente en el trigger de la DB
  // (FC_A => importe_liquidado * 1.21, resto => importe_liquidado)
  tipo_liquidacion: z.enum(['NORMAL', 'SALDO_INICIAL']).default('NORMAL'),
  notas: z.string().optional(),
})

export type TLiquidacionForm = z.infer<typeof liquidacionSchema>
