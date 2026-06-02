import { z } from 'zod'

export const claveSchema = z.object({
  tipo:    z.string().min(1, 'El tipo es requerido'),
  usuario: z.string().optional(),
  clave:   z.string().min(1, 'La clave es requerida'),
  notas:   z.string().optional(),
})

export type TClaveForm = z.infer<typeof claveSchema>
