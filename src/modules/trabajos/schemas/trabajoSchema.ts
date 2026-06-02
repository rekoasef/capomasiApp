import { z } from 'zod'

export const trabajoSchema = z.object({
  cliente_id:   z.string().uuid('Cliente requerido'),
  tipo_trabajo: z.string().min(1, 'Tipo de trabajo requerido'),
  anio:         z.coerce.number().int().min(2020).max(2100),
  honorario:    z.coerce.number().positive('El honorario debe ser mayor a 0').optional(),
  asignado_a:   z.string().uuid().optional(),
  notas:        z.string().optional(),
  empleada_ids: z.array(z.string().uuid()).optional(),
})

export const actualizarEstadoSchema = z.object({
  estado:    z.enum(['PENDIENTE', 'EN_PROCESO', 'FINALIZADO', 'COBRADO']),
  honorario: z.coerce.number().positive('El honorario debe ser mayor a 0').optional(),
  notas:     z.string().optional(),
})

export type TTrabajoForm = z.infer<typeof trabajoSchema>
export type TActualizarEstadoForm = z.infer<typeof actualizarEstadoSchema>
