import { z } from 'zod'

export const fondoMovimientoSchema = z
  .object({
    tipo_movimiento: z.enum(['INGRESO', 'EGRESO', 'MOVIMIENTO']),
    fecha: z.string().date(),
    concepto: z.string().min(2, 'Concepto requerido'),
    nro_comprobante: z.string().optional().nullable(),
    cuenta_bancaria: z.string().optional().nullable(),
    importe_banco: z.number().min(0).default(0),
    importe_efectivo: z.number().min(0).default(0),
    importe_usd: z.number().min(0).default(0),
    importe_taralo: z.number().min(0).default(0),
    notas: z.string().optional().nullable(),
  })
  .refine(
    (d) =>
      d.importe_banco > 0 || d.importe_efectivo > 0 || d.importe_usd > 0 || d.importe_taralo > 0,
    { message: 'Al menos un importe debe ser mayor a cero' }
  )

export type TFondoMovimientoForm = z.infer<typeof fondoMovimientoSchema>

// Banco, efectivo y tarallo son todos pesos: mover $100 de uno a otro
// tiene que llegar como $100. Solo cuando una punta es dólares entra
// y sale un importe distinto. Vive acá para que el formulario y la
// validación usen la misma regla.
export function esCambioDeMoneda(origen: string, destino: string): boolean {
  return (origen === 'usd') !== (destino === 'usd')
}

export const transferenciaFondosSchema = z
  .object({
    origen: z.enum(['banco', 'efectivo', 'usd', 'taralo']),
    destino: z.enum(['banco', 'efectivo', 'usd', 'taralo']),
    importe: z.number().positive('El importe debe ser mayor a 0'),
    importe_destino: z.number().positive('Tiene que ser mayor a 0').nullish(),
    fecha: z.string().date(),
    concepto: z.string().min(2, 'Motivo requerido'),
    notas: z.string().optional().nullable(),
  })
  .refine((d) => d.origen !== d.destino, {
    message: 'El origen y el destino no pueden ser la misma cuenta',
    path: ['destino'],
  })
  .refine((d) => !esCambioDeMoneda(d.origen, d.destino) || !!d.importe_destino, {
    message: 'Cargá cuánto entra en la otra cuenta',
    path: ['importe_destino'],
  })

export type TTransferenciaFondosForm = z.infer<typeof transferenciaFondosSchema>

export const chequeManualSchema = z
  .object({
    tipo: z.enum(['PROPIO', 'TERCERO']),
    numero: z.string().min(1, 'Número requerido'),
    banco: z.string().min(1, 'Banco requerido'),
    importe: z.number().positive('El importe debe ser mayor a 0'),
    fecha_emision: z.string().date(),
    fecha_cobro: z.string().date().optional().nullable(),
    cliente_id: z.string().uuid().optional().nullable(),
    proveedor_id: z.string().uuid().optional().nullable(),
    cuenta_bancaria: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),
  })
  .refine((d) => d.tipo !== 'TERCERO' || !!d.cliente_id, {
    message: 'Seleccioná de qué cliente es el cheque',
    path: ['cliente_id'],
  })
  .refine((d) => d.tipo !== 'PROPIO' || !!d.proveedor_id, {
    message: 'Seleccioná a qué proveedor se le pagó',
    path: ['proveedor_id'],
  })

export type TChequeManualForm = z.infer<typeof chequeManualSchema>

// Sacar un cheque de tercero de la cartera sin imputarlo a ninguna
// factura: lo cambió en una cueva/financiera o lo usó para algo
// personal. La nota es el único dato obligatorio — pedido de Paola
// (2026-09-17). El tope contra el importe del cheque lo valida
// fn_salida_cheque_sin_factura, que es la que conoce el cheque.
export const chequeSalidaSchema = z
  .object({
    destino: z.enum(['CAMBIO_EFECTIVO', 'PERSONAL']),
    fecha: z.string().date(),
    notas: z.string().trim().min(3, 'Contá qué hiciste con el cheque'),
    importe_recibido: z.number().positive('Cargá cuánto te dieron por el cheque').nullish(),
    cuenta_recibido: z.enum(['efectivo', 'banco']),
  })
  .refine((d) => d.destino !== 'CAMBIO_EFECTIVO' || !!d.importe_recibido, {
    message: 'Cargá cuánto te dieron por el cheque',
    path: ['importe_recibido'],
  })

export type TChequeSalidaForm = z.infer<typeof chequeSalidaSchema>
