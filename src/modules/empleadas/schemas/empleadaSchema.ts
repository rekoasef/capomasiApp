import { z } from 'zod'
import { CONCEPTO_HORAS } from '../services/calcularLiquidacionMes'

export const empleadaSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  apellido: z.string().optional().nullable(),
  tipo_relacion: z.enum(['DEPENDENCIA', 'POR_HORA']),
  tipo_comision: z.enum(['PRODUCCION', 'PUNTAJE', 'HORAS', 'NINGUNA']).default('NINGUNA'),
  usuario_id: z.string().uuid().optional().nullable(),
  activo: z.boolean().default(true),
  fecha_nacimiento: z.string().date().optional().nullable(),
  dni: z.string().optional().nullable(),
  email: z
    .union([z.string().email('Email inválido'), z.literal('')])
    .optional()
    .nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  cbu: z.string().optional().nullable(),
  alias_cbu: z.string().optional().nullable(),
  fecha_ingreso: z.string().date().optional().nullable(),
  sueldo_fijo: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Debe ser mayor a 0').optional()
  ),
  // Valor vigente para las empleadas POR_HORA. Se copia a cada liquidación
  // al cargarla, así cambiarlo no reescribe los meses ya liquidados.
  valor_hora: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Debe ser mayor a 0').optional()
  ),
})

const horasInput = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().positive('Debe ser mayor a 0').optional()
)

export const liquidacionEmpleadaSchema = z
  .object({
    empleada_id: z.string().uuid(),
    concepto: z.string().min(1, 'Concepto requerido'),
    tipo_concepto: z.enum(['HABER', 'DESCUENTO']),
    periodo_mes: z.number().int().min(1).max(12),
    periodo_anio: z.number().int().min(2020),
    importe: z.number().positive('Importe debe ser positivo'),
    observaciones: z.string().optional().nullable(),
    // Solo en el concepto "Horas trabajadas". Van juntas o no van.
    cantidad_horas: horasInput,
    valor_hora: horasInput,
  })
  .superRefine((data, ctx) => {
    if (data.concepto !== CONCEPTO_HORAS) return
    if (!data.cantidad_horas) {
      ctx.addIssue({ code: 'custom', path: ['cantidad_horas'], message: 'Horas requeridas' })
    }
    if (!data.valor_hora) {
      ctx.addIssue({ code: 'custom', path: ['valor_hora'], message: 'Valor hora requerido' })
    }
  })

export const pagoEmpleadaSchema = z.object({
  empleada_id: z.string().uuid(),
  periodo_mes: z.number().int().min(1).max(12),
  periodo_anio: z.number().int().min(2020),
  tipo_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE']),
  importe: z.number().positive(),
  fecha_pago: z.string().date(),
  cuenta_bancaria: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
})

const positiveInput = (msg: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive(msg)
  )

const nonnegInput = (msg: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0, msg)
  )

export const comisionConfigSchema = z.object({
  empleada_id: z.string().uuid(),
  tipo_calculo: z.enum(['PORCENTAJE', 'MONTO_FIJO', 'VALOR_HORA']),
  valor: nonnegInput('El valor debe ser 0 o mayor'),
  umbral_puntaje: positiveInput('El umbral debe ser mayor a 0').optional().nullable(),
  vigente_desde: z.string().date(),
})

export const puntosTrabajoConfigSchema = z
  .object({
    cliente_id: z.string().uuid('Cliente requerido'),
    tipo_trabajo: z.string().min(1, 'Tipo de trabajo requerido'),
    puntos: nonnegInput('Los puntos deben ser 0 o más'),
    activo: z.boolean().default(true),
    facturar_aparte: z.boolean().default(true),
    empleada_id: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : v),
      z.string().uuid().nullable()
    ),
    tipo_vencimiento: z.enum(['MENSUAL', 'ANUAL', 'A_DEMANDA']).default('A_DEMANDA'),
    dia_vencimiento_mensual: z
      .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
        z.number().int().min(1).max(31).nullable()
      )
      .optional(),
    mes_vencimiento_anual: z
      .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
        z.number().int().min(1).max(12).nullable()
      )
      .optional(),
    dia_vencimiento_anual: z
      .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
        z.number().int().min(1).max(31).nullable()
      )
      .optional(),
    fecha_demanda: z.string().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.tipo_vencimiento === 'MENSUAL' && !val.dia_vencimiento_mensual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresá el día del mes',
        path: ['dia_vencimiento_mensual'],
      })
    }
    if (val.tipo_vencimiento === 'ANUAL') {
      if (!val.mes_vencimiento_anual)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresá el mes',
          path: ['mes_vencimiento_anual'],
        })
      if (!val.dia_vencimiento_anual)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresá el día',
          path: ['dia_vencimiento_anual'],
        })
    }
  })

export const valoresPuntoTipoSchema = z.object({
  tipo_trabajo: z.string().min(1, 'Tipo de trabajo requerido'),
  valor_por_punto: positiveInput('El valor debe ser mayor a 0'),
  vigente_desde: z.string().date(),
})

export const registroPuntajeSchema = z.object({
  empleada_id: z.string().uuid(),
  periodo_mes: z.number().int().min(1).max(12),
  periodo_anio: z.number().int().min(2020),
  descripcion: z.string().min(1, 'Descripción requerida'),
  puntos: positiveInput('Los puntos deben ser mayores a 0'),
  tipo_trabajo: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().nullable()
  ),
})

export const registroHorasSchema = z.object({
  empleada_id: z.string().uuid(),
  fecha: z.string().date(),
  horas: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Las horas deben ser mayores a 0').max(24, 'Máximo 24 horas por día')
  ),
  descripcion: z.string().optional().nullable(),
})

export type TEmpleadaForm = z.infer<typeof empleadaSchema>
export type TLiquidacionEmpleadaForm = z.infer<typeof liquidacionEmpleadaSchema>
export type TPagoEmpleadaForm = z.infer<typeof pagoEmpleadaSchema>
export type TComisionConfigForm = z.infer<typeof comisionConfigSchema>
export type TRegistroPuntajeForm = z.infer<typeof registroPuntajeSchema>
export type TRegistroHorasForm = z.infer<typeof registroHorasSchema>
export type TPuntosTrabajoConfigForm = z.infer<typeof puntosTrabajoConfigSchema>
export type TValoresPuntoTipoForm = z.infer<typeof valoresPuntoTipoSchema>
