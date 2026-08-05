import { z } from 'zod'

export const proveedorSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  cuit: z.string().optional().nullable(),
  rubro: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  notas: z.string().optional().nullable(),
  activo: z.boolean().default(true),
})

export const compraProveedorSchema = z.object({
  proveedor_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.string().uuid().nullable()
  ),
  fecha: z.string().date(),
  concepto: z.string().min(2, 'Concepto requerido'),
  nro_comprobante: z.string().optional().nullable(),
  tipo_comprobante: z.string().optional().nullable(),
  importe_total: z.number().positive('Importe debe ser positivo'),
  notas: z.string().optional().nullable(),
})

export const pagoProveedorSchema = z
  .object({
    compra_id: z.string().uuid(),
    tipo_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE']),
    importe: z.number().positive(),
    fecha_pago: z.string().date(),
    cuenta_bancaria: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),
    cheque_numero: z.string().optional().nullable(),
    cheque_banco: z.string().optional().nullable(),
    cheque_fecha_emision: z.string().optional().nullable(),
  })
  .refine((d) => d.tipo_pago !== 'CHEQUE' || !!d.cheque_numero, {
    message: 'Número de cheque requerido',
    path: ['cheque_numero'],
  })
  .refine((d) => d.tipo_pago !== 'CHEQUE' || !!d.cheque_banco, {
    message: 'Banco requerido',
    path: ['cheque_banco'],
  })
  .refine((d) => d.tipo_pago !== 'CHEQUE' || !!d.cheque_fecha_emision, {
    message: 'Fecha de emisión requerida',
    path: ['cheque_fecha_emision'],
  })

export const gastoProveedorSchema = z
  .object({
    proveedor_id: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : v),
      z.string().uuid().nullable()
    ),
    fecha: z.string().date(),
    concepto: z.string().min(2, 'Concepto requerido'),
    nro_comprobante: z.string().optional().nullable(),
    tipo_comprobante: z.string().optional().nullable(),
    importe_total: z.number().positive('Importe debe ser positivo'),
    notas: z.string().optional().nullable(),
    tipo_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE']),
    cuenta_bancaria: z.string().optional().nullable(),
    cheque_numero: z.string().optional().nullable(),
    cheque_banco: z.string().optional().nullable(),
    cheque_fecha_emision: z.string().optional().nullable(),
  })
  .refine((d) => d.tipo_pago !== 'CHEQUE' || !!d.cheque_numero, {
    message: 'Número de cheque requerido',
    path: ['cheque_numero'],
  })
  .refine((d) => d.tipo_pago !== 'CHEQUE' || !!d.cheque_banco, {
    message: 'Banco requerido',
    path: ['cheque_banco'],
  })
  .refine((d) => d.tipo_pago !== 'CHEQUE' || !!d.cheque_fecha_emision, {
    message: 'Fecha de emisión requerida',
    path: ['cheque_fecha_emision'],
  })

export type TProveedorForm = z.infer<typeof proveedorSchema>
export type TCompraProveedorForm = z.infer<typeof compraProveedorSchema>
export type TPagoProveedorForm = z.infer<typeof pagoProveedorSchema>
export type TGastoProveedorForm = z.infer<typeof gastoProveedorSchema>
