import { z } from 'zod'

export const imputacionInlineSchema = z.object({
  liquidacion_id: z.string().uuid(),
  importe: z.coerce.number().positive('Importe inválido'),
})

// Un medio de pago del recibo. Un cobro puede tener varios: dos cheques
// y el efectivo que completa el monto, por ejemplo.
export const medioPagoSchema = z.object({
  tipo_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'USD', 'COMPENSACION']),
  importe: z.coerce.number().positive('El importe debe ser mayor a 0'),
  cuenta_bancaria: z.string().optional(),
  importe_usd: z.coerce.number().positive().optional(),
  tipo_cambio: z.coerce.number().positive().optional(),
  cheque_numero: z.string().optional(),
  cheque_banco: z.string().optional(),
  cheque_fecha_cobro: z.string().optional(),
})

export type TMedioPagoForm = z.infer<typeof medioPagoSchema>

export function totalMedios(medios: { importe: number }[]): number {
  return Math.round(medios.reduce((acc, m) => acc + (Number(m.importe) || 0), 0) * 100) / 100
}

export const reciboSchema = z
  .object({
    cliente_id: z.string().uuid('Cliente requerido'),
    fecha: z.string().min(1, 'Fecha requerida'),
    medios: z.array(medioPagoSchema).min(1, 'Agregá al menos un medio de pago'),
    numero_recibo: z.string().optional(),
    vuelto_efectivo: z.coerce.number().nonnegative('Vuelto inválido').optional(),
    notas: z.string().optional(),
    imputaciones: z.array(imputacionInlineSchema).default([]),
  })
  .superRefine((data, ctx) => {
    data.medios.forEach((medio, i) => {
      if (medio.tipo_pago === 'USD') {
        if (!medio.importe_usd) {
          ctx.addIssue({
            code: 'custom',
            path: ['medios', i, 'importe_usd'],
            message: 'Importe USD requerido',
          })
        }
        if (!medio.tipo_cambio) {
          ctx.addIssue({
            code: 'custom',
            path: ['medios', i, 'tipo_cambio'],
            message: 'Tipo de cambio requerido',
          })
        }
      }
      if (medio.tipo_pago === 'CHEQUE') {
        if (!medio.cheque_numero) {
          ctx.addIssue({
            code: 'custom',
            path: ['medios', i, 'cheque_numero'],
            message: 'Número de cheque requerido',
          })
        }
        if (!medio.cheque_banco) {
          ctx.addIssue({
            code: 'custom',
            path: ['medios', i, 'cheque_banco'],
            message: 'Banco requerido',
          })
        }
      }
    })

    const total = totalMedios(data.medios)

    // El vuelto es el efectivo que se le devuelve al cliente cuando el cheque
    // tapa de más. Solo tiene sentido sobre un cheque único: con varios medios
    // no se sabría de cuál sale.
    const vuelto = data.vuelto_efectivo ?? 0
    if (vuelto > 0) {
      if (data.medios.length !== 1 || data.medios[0].tipo_pago !== 'CHEQUE') {
        ctx.addIssue({
          code: 'custom',
          path: ['vuelto_efectivo'],
          message: 'El vuelto en efectivo solo aplica a un recibo con un único cheque',
        })
      } else if (vuelto >= total) {
        ctx.addIssue({
          code: 'custom',
          path: ['vuelto_efectivo'],
          message: 'El vuelto no puede ser mayor o igual al importe total',
        })
      }
    }

    const totalImputado = data.imputaciones.reduce((acc, i) => acc + i.importe, 0)
    if (totalImputado > total + 0.001) {
      ctx.addIssue({
        code: 'custom',
        path: ['imputaciones'],
        message: `Las imputaciones (${totalImputado}) superan el importe del recibo (${total})`,
      })
    }
  })

export type TReciboForm = z.infer<typeof reciboSchema>

export const imputacionSchema = z.object({
  recibo_id: z.string().uuid(),
  liquidacion_id: z.string().uuid(),
  importe: z.coerce.number().positive('Importe inválido'),
  notas: z.string().optional(),
})

export type TImputacionForm = z.infer<typeof imputacionSchema>
