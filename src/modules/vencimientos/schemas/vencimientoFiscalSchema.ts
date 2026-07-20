import { z } from 'zod'

export const vencimientoFiscalSchema = z.object({
  cliente_id: z.string().uuid('Cliente requerido'),
  empleada_id: z.string().uuid('Empleada requerida').nullable().optional(),
  tipo_vencimiento: z.string().min(1, 'Tipo de vencimiento requerido'),
  fecha_vencimiento: z.string().min(1, 'Fecha requerida'),
  descripcion: z.string().min(2, 'Descripción requerida'),
  ambito: z.enum(['CLIENTE', 'ESTUDIO']),
  notas: z.string().optional().nullable(),
})

export type TVencimientoFiscalForm = z.infer<typeof vencimientoFiscalSchema>

export const actualizarEstadoAvanceSchema = z.object({
  estado_avance: z.enum(['PENDIENTE', 'INICIADO', 'EN_PROCESO', 'TERMINADO', 'APROBADO']),
  observaciones_empleada: z.string().optional().nullable(),
})

export type TActualizarEstadoAvanceForm = z.infer<typeof actualizarEstadoAvanceSchema>
