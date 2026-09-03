import { z } from 'zod'

// Deuda que el cliente traía de antes del sistema. Se carga como un número
// suelto en la cuenta corriente: no genera factura ni cuenta como ingreso.
export const saldoInicialSchema = z.object({
  cliente_id: z.string().uuid('Cliente requerido'),
  fecha_liquidacion: z.string().min(1, 'Fecha requerida'),
  importe: z.coerce.number().positive('El importe debe ser mayor a 0'),
  detalle: z.string().optional(),
})

export type TSaldoInicialForm = z.infer<typeof saldoInicialSchema>
