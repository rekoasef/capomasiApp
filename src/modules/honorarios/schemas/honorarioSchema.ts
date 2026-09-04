import { z } from 'zod'

export const setHonorarioSchema = z.object({
  monto: z
    .string()
    .min(1, 'El monto es requerido')
    .transform(Number)
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  frecuencia_ajuste_meses: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1, 'Mínimo 1 mes').max(24, 'Máximo 24 meses')),
  notas: z.string().optional(),
})

export const ajusteSchema = z.object({
  porcentaje: z
    .string()
    .min(1, 'El porcentaje es requerido')
    .transform(Number)
    .pipe(z.number().positive('El porcentaje debe ser mayor a 0').max(500, 'Máximo 500%')),
  notas: z.string().optional(),
})

// Edición manual del monto: la observación es obligatoria — es lo que después
// explica en el historial por qué varió (más/menos empleados o servicios).
export const editarHonorarioSchema = z.object({
  monto: z
    .string()
    .min(1, 'El monto es requerido')
    .transform(Number)
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  frecuencia_ajuste_meses: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1, 'Mínimo 1 mes').max(24, 'Máximo 24 meses')),
  observacion: z.string().trim().min(3, 'Contá por qué cambia el honorario'),
})

export type TSetHonorarioForm = z.input<typeof setHonorarioSchema>
export type TAjusteForm = z.input<typeof ajusteSchema>
export type TEditarHonorarioForm = z.input<typeof editarHonorarioSchema>
