import { z } from 'zod'

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v)

export const pagoGastoSchema = z.object({
  categoria_id: z.string().uuid('Categoría requerida'),
  gasto_recurrente_id: z.preprocess(emptyToNull, z.string().uuid().nullable()).optional(),
  concepto: z.string().trim().min(2, 'Concepto requerido'),
  fecha_pago: z.string().date(),
  medio_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA']),
  // Puede ser 0: los gastos anuales se cargan como vencimiento y se
  // van marcando como pagados aunque el importe todavia no se sepa.
  importe: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
    z.number().nonnegative('No puede ser negativo')
  ),
  comprobante_url: z.preprocess(emptyToNull, z.string().url('Link inválido').nullable()).optional(),
  notas: z.preprocess(emptyToNull, z.string().nullable()).optional(),
})

export type TPagoGastoForm = z.infer<typeof pagoGastoSchema>
