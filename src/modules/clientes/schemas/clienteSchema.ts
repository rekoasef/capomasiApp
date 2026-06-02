import { z } from 'zod'
import { validarCuit } from '@/shared/utils/validators'

export const clienteSchema = z.object({
  nombre:    z.string().min(2, 'El nombre es requerido'),
  cuit:      z.string()
               .regex(/^\d{11}$/, 'El CUIT debe tener 11 dígitos sin guiones')
               .refine(validarCuit, 'CUIT inválido'),
  domicilio: z.string().optional(),
  telefono:  z.string().optional(),
  email:     z.string().email('Email inválido').optional().or(z.literal('')),
  localidad: z.string().optional(),
  notas:     z.string().optional(),
})

export type TClienteForm = z.infer<typeof clienteSchema>
