import { z } from 'zod'

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v)

export const categoriaGastoSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre requerido'),
  color: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
        .nullable()
    )
    .optional(),
  activo: z.boolean().default(true),
  ambito: z.enum(['PERSONAL', 'ESTUDIO']).default('PERSONAL'),
})

export type TCategoriaGastoForm = z.infer<typeof categoriaGastoSchema>
