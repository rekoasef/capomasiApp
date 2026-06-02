import { z } from 'zod'

export const trabajoRealizadoSchema = z.object({
  empleada_ids: z.array(z.string().uuid()).optional(),
  fecha: z.string().min(1, 'Fecha requerida'),
  cliente_id: z.string().uuid().optional().nullable(),
  tipo_trabajo: z.string().min(1, 'Tipo de trabajo requerido'),
  descripcion: z.string().min(3, 'Descripción requerida'),
})

export const aprobarTrabajoSchema = z.object({
  trabajo_id: z.string().uuid(),
  genera_comision: z.boolean(),
  importe_comision: z.coerce.number().min(0, 'Importe inválido').optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.genera_comision && (data.importe_comision === null || data.importe_comision === undefined)) {
    ctx.addIssue({
      code: 'custom',
      path: ['importe_comision'],
      message: 'Importe de comisión requerido',
    })
  }
})

export const importarComisionesSchema = z.object({
  empleada_id: z.string().uuid(),
  periodo_mes: z.number().int().min(1).max(12),
  periodo_anio: z.number().int().min(2020),
})

export type TTrabajoRealizadoForm = z.infer<typeof trabajoRealizadoSchema>
export type TAprobarTrabajoForm = z.infer<typeof aprobarTrabajoSchema>
export type TImportarComisionesForm = z.infer<typeof importarComisionesSchema>
