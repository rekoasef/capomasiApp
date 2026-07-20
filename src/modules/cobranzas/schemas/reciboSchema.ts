import { z } from 'zod'

export const imputacionInlineSchema = z.object({
  liquidacion_id: z.string().uuid(),
  importe: z.coerce.number().positive('Importe inválido'),
})

export const reciboSchema = z
  .object({
    cliente_id: z.string().uuid('Cliente requerido'),
    fecha: z.string().min(1, 'Fecha requerida'),
    tipo_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'USD', 'COMPENSACION']),
    importe: z.coerce.number().positive('El importe debe ser mayor a 0'),
    numero_recibo: z.string().optional(),
    cuenta_bancaria: z.string().optional(),
    importe_usd: z.coerce.number().positive().optional(),
    tipo_cambio: z.coerce.number().positive('Tipo de cambio requerido').optional(),
    cheque_numero: z.string().optional(),
    cheque_banco: z.string().optional(),
    cheque_fecha_cobro: z.string().optional(),
    vuelto_efectivo: z.coerce.number().nonnegative('Vuelto inválido').optional(),
    notas: z.string().optional(),
    imputaciones: z.array(imputacionInlineSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_pago === 'USD') {
      if (!data.importe_usd) {
        ctx.addIssue({ code: 'custom', path: ['importe_usd'], message: 'Importe USD requerido' })
      }
      if (!data.tipo_cambio) {
        ctx.addIssue({ code: 'custom', path: ['tipo_cambio'], message: 'Tipo de cambio requerido' })
      }
    }
    if (data.tipo_pago === 'CHEQUE') {
      if (!data.cheque_numero) {
        ctx.addIssue({
          code: 'custom',
          path: ['cheque_numero'],
          message: 'Número de cheque requerido',
        })
      }
      if (!data.cheque_banco) {
        ctx.addIssue({ code: 'custom', path: ['cheque_banco'], message: 'Banco requerido' })
      }
    }

    const vuelto = data.vuelto_efectivo ?? 0
    if (vuelto > 0 && data.tipo_pago !== 'CHEQUE') {
      ctx.addIssue({
        code: 'custom',
        path: ['vuelto_efectivo'],
        message: 'El vuelto en efectivo solo aplica a pagos con cheque',
      })
    }
    if (vuelto >= data.importe) {
      ctx.addIssue({
        code: 'custom',
        path: ['vuelto_efectivo'],
        message: 'El vuelto no puede ser mayor o igual al importe total',
      })
    }

    const totalImputado = data.imputaciones.reduce((acc, i) => acc + i.importe, 0)
    if (totalImputado > data.importe + 0.001) {
      ctx.addIssue({
        code: 'custom',
        path: ['imputaciones'],
        message: `Las imputaciones (${totalImputado}) superan el importe del recibo (${data.importe})`,
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
