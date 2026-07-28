import { z } from 'zod'

export const fondoMovimientoSchema = z
  .object({
    tipo_movimiento: z.enum(['INGRESO', 'EGRESO', 'MOVIMIENTO']),
    fecha: z.string().date(),
    concepto: z.string().min(2, 'Concepto requerido'),
    nro_comprobante: z.string().optional().nullable(),
    cuenta_bancaria: z.string().optional().nullable(),
    importe_banco: z.number().min(0).default(0),
    importe_efectivo: z.number().min(0).default(0),
    importe_usd: z.number().min(0).default(0),
    importe_taralo: z.number().min(0).default(0),
    notas: z.string().optional().nullable(),
  })
  .refine(
    (d) =>
      d.importe_banco > 0 || d.importe_efectivo > 0 || d.importe_usd > 0 || d.importe_taralo > 0,
    { message: 'Al menos un importe debe ser mayor a cero' }
  )

export type TFondoMovimientoForm = z.infer<typeof fondoMovimientoSchema>

export const chequeManualSchema = z
  .object({
    tipo: z.enum(['PROPIO', 'TERCERO']),
    numero: z.string().min(1, 'Número requerido'),
    banco: z.string().min(1, 'Banco requerido'),
    importe: z.number().positive('El importe debe ser mayor a 0'),
    fecha_emision: z.string().date(),
    fecha_cobro: z.string().date().optional().nullable(),
    cliente_id: z.string().uuid().optional().nullable(),
    proveedor_id: z.string().uuid().optional().nullable(),
    cuenta_bancaria: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),
  })
  .refine((d) => d.tipo !== 'TERCERO' || !!d.cliente_id, {
    message: 'Seleccioná de qué cliente es el cheque',
    path: ['cliente_id'],
  })
  .refine((d) => d.tipo !== 'PROPIO' || !!d.proveedor_id, {
    message: 'Seleccioná a qué proveedor se le pagó',
    path: ['proveedor_id'],
  })

export type TChequeManualForm = z.infer<typeof chequeManualSchema>
