import { z } from 'zod'

export const notaEmpleadaSchema = z.object({
  empleada_id: z.string().uuid('Empleada requerida'),
  contenido: z
    .string()
    .trim()
    .min(1, 'La nota no puede estar vacía')
    .max(2000, 'Máximo 2000 caracteres'),
})

export type TNotaEmpleadaForm = z.infer<typeof notaEmpleadaSchema>
