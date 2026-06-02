import { z } from 'zod'

export const proveedorSchema = z.object({
  nombre:   z.string().min(2, 'Nombre requerido'),
  cuit:     z.string().optional().nullable(),
  rubro:    z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email:    z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  notas:    z.string().optional().nullable(),
  activo:   z.boolean().default(true),
})

export const compraProveedorSchema = z.object({
  proveedor_id:     z.string().uuid(),
  fecha:            z.string().date(),
  concepto:         z.string().min(2, 'Concepto requerido'),
  nro_comprobante:  z.string().optional().nullable(),
  tipo_comprobante: z.string().optional().nullable(),
  importe_total:    z.number().positive('Importe debe ser positivo'),
  notas:            z.string().optional().nullable(),
})

export const pagoProveedorSchema = z.object({
  compra_id:       z.string().uuid(),
  tipo_pago:       z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE']),
  importe:         z.number().positive(),
  fecha_pago:      z.string().date(),
  cuenta_bancaria: z.string().optional().nullable(),
  notas:           z.string().optional().nullable(),
})

export type TProveedorForm        = z.infer<typeof proveedorSchema>
export type TCompraProveedorForm  = z.infer<typeof compraProveedorSchema>
export type TPagoProveedorForm    = z.infer<typeof pagoProveedorSchema>
