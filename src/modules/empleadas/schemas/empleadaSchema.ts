import { z } from 'zod'

export const empleadaSchema = z.object({
  nombre:           z.string().min(2, 'Nombre requerido'),
  apellido:         z.string().optional().nullable(),
  tipo_relacion:    z.enum(['DEPENDENCIA', 'POR_HORA']),
  tipo_comision:    z.enum(['PRODUCCION', 'PUNTAJE', 'HORAS', 'NINGUNA']).default('NINGUNA'),
  usuario_id:       z.string().uuid().optional().nullable(),
  activo:           z.boolean().default(true),
  fecha_nacimiento: z.string().date().optional().nullable(),
  dni:              z.string().optional().nullable(),
  email:            z.union([z.string().email('Email inválido'), z.literal('')]).optional().nullable(),
  telefono:         z.string().optional().nullable(),
  direccion:        z.string().optional().nullable(),
  localidad:        z.string().optional().nullable(),
  cbu:              z.string().optional().nullable(),
  alias_cbu:        z.string().optional().nullable(),
  fecha_ingreso:    z.string().date().optional().nullable(),
  sueldo_fijo:      z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Debe ser mayor a 0').optional()
  ),
})

export const liquidacionEmpleadaSchema = z.object({
  empleada_id:   z.string().uuid(),
  concepto:      z.string().min(1, 'Concepto requerido'),
  tipo_concepto: z.enum(['HABER', 'DESCUENTO']),
  periodo_mes:   z.number().int().min(1).max(12),
  periodo_anio:  z.number().int().min(2020),
  importe:       z.number().positive('Importe debe ser positivo'),
  observaciones: z.string().optional().nullable(),
})

export const pagoEmpleadaSchema = z.object({
  empleada_id:     z.string().uuid(),
  periodo_mes:     z.number().int().min(1).max(12),
  periodo_anio:    z.number().int().min(2020),
  tipo_pago:       z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE']),
  importe:         z.number().positive(),
  fecha_pago:      z.string().date(),
  cuenta_bancaria: z.string().optional().nullable(),
  notas:           z.string().optional().nullable(),
})

const positiveInput = (msg: string) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().positive(msg))

const nonnegInput = (msg: string) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().min(0, msg))

export const comisionConfigSchema = z.object({
  empleada_id:    z.string().uuid(),
  tipo_calculo:   z.enum(['PORCENTAJE', 'MONTO_FIJO', 'VALOR_HORA']),
  valor:          nonnegInput('El valor debe ser 0 o mayor'),
  umbral_puntaje: positiveInput('El umbral debe ser mayor a 0').optional().nullable(),
  vigente_desde:  z.string().date(),
})

export const puntosTrabajoConfigSchema = z.object({
  cliente_id:   z.string().uuid('Cliente requerido'),
  tipo_trabajo: z.string().min(1, 'Tipo de trabajo requerido'),
  puntos:       positiveInput('Los puntos deben ser mayores a 0'),
  activo:       z.boolean().default(true),
})

export const valoresPuntoTipoSchema = z.object({
  tipo_trabajo:    z.string().min(1, 'Tipo de trabajo requerido'),
  valor_por_punto: positiveInput('El valor debe ser mayor a 0'),
  vigente_desde:   z.string().date(),
})

export const registroPuntajeSchema = z.object({
  empleada_id:  z.string().uuid(),
  periodo_mes:  z.number().int().min(1).max(12),
  periodo_anio: z.number().int().min(2020),
  descripcion:  z.string().min(1, 'Descripción requerida'),
  puntos:       positiveInput('Los puntos deben ser mayores a 0'),
})

export const registroHorasSchema = z.object({
  empleada_id: z.string().uuid(),
  fecha:       z.string().date(),
  horas:       z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Las horas deben ser mayores a 0').max(24, 'Máximo 24 horas por día')
  ),
  descripcion: z.string().optional().nullable(),
})

export type TEmpleadaForm              = z.infer<typeof empleadaSchema>
export type TLiquidacionEmpleadaForm   = z.infer<typeof liquidacionEmpleadaSchema>
export type TPagoEmpleadaForm          = z.infer<typeof pagoEmpleadaSchema>
export type TComisionConfigForm        = z.infer<typeof comisionConfigSchema>
export type TRegistroPuntajeForm       = z.infer<typeof registroPuntajeSchema>
export type TRegistroHorasForm         = z.infer<typeof registroHorasSchema>
export type TPuntosTrabajoConfigForm   = z.infer<typeof puntosTrabajoConfigSchema>
export type TValoresPuntoTipoForm      = z.infer<typeof valoresPuntoTipoSchema>
