import { z } from 'zod'

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v)

export const gastoRecurrenteSchema = z.object({
  categoria_id:    z.string().uuid('Categoría requerida'),
  descripcion:     z.string().trim().min(2, 'Descripción requerida'),
  dia_vencimiento: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
    z.number().int().min(1, 'Debe ser entre 1 y 31').max(31, 'Debe ser entre 1 y 31')
  ),
  activo: z.boolean().default(true),
  notas:  z.preprocess(emptyToNull, z.string().nullable()).optional(),
})

export type TGastoRecurrenteForm = z.infer<typeof gastoRecurrenteSchema>
