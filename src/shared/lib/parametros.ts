import type { ParametroOption } from '../hooks/useParametros'

export const FALLBACK_TIPOS_SERVICIO: ParametroOption[] = [
  { value: 'HONORARIO_MENSUAL', label: 'Honorario mensual' },
  { value: 'HONORARIO_ANUAL', label: 'Honorario anual' },
  { value: 'BALANCE', label: 'Balance' },
  { value: 'GANANCIAS_PF', label: 'Ganancias PF' },
  { value: 'ISIB', label: 'ISIB' },
  { value: 'BIENES_PERSONALES', label: 'Bienes personales' },
  { value: 'CONSULTORIA_COSTOS', label: 'Consultoría de costos' },
  { value: 'INSCRIPCIONES', label: 'Inscripciones' },
  { value: 'OTROS', label: 'Otros' },
]

export const FALLBACK_GENERADO_POR: ParametroOption[] = [
  { value: 'PAOLA', label: 'Paola' },
  { value: 'LUCIANA', label: 'Luciana' },
  { value: 'VICTORIA', label: 'Victoria' },
  { value: 'PABLO', label: 'Pablo' },
  { value: 'PAOLA_LUCIANA', label: 'Paola + Luciana' },
  { value: 'PAOLA_VICTORIA', label: 'Paola + Victoria' },
  { value: 'LUCIANA_VICTORIA', label: 'Luciana + Victoria' },
  { value: 'TODOS', label: 'Todos' },
]

export const FALLBACK_TIPOS_CLAVE: ParametroOption[] = [
  { value: 'AFIP', label: 'AFIP' },
  { value: 'ANSES', label: 'ANSES' },
  { value: 'ARBA', label: 'ARBA' },
  { value: 'SINDICATO', label: 'Sindicato' },
  { value: 'BANCO', label: 'Banco' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'RENTAS', label: 'Rentas' },
  { value: 'OTROS', label: 'Otros' },
]

export const FALLBACK_TIPOS_COMPROBANTE: ParametroOption[] = [
  { value: 'FC_A', label: 'FC A' },
  { value: 'FC_B', label: 'FC B' },
  { value: 'FC_C', label: 'FC C' },
  { value: 'PRESUPUESTO', label: 'Presupuesto' },
  { value: 'ND', label: 'ND' },
  { value: 'NC', label: 'NC' },
]

export const FALLBACK_CUENTAS_BANCARIAS: ParametroOption[] = [
  { value: 'BANCO_NACION_CA_PESOS', label: 'Banco Nación - CA Pesos' },
  { value: 'BANCO_NACION_USD', label: 'Banco Nación - USD' },
]

export const FALLBACK_TIPOS_PAGO_COBRANZAS: ParametroOption[] = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'COMPENSACION', label: 'Compensación' },
]

export const FALLBACK_RUBROS_PROVEEDOR: ParametroOption[] = [
  { value: 'COMBUSTIBLE', label: 'Combustible' },
  { value: 'COMPUTACION', label: 'Computación' },
  { value: 'ENERGIA', label: 'Energía' },
  { value: 'GASTOS_GENERALES', label: 'Gastos generales' },
  { value: 'HONORARIOS', label: 'Honorarios - asesoría' },
  { value: 'IMPUESTOS', label: 'Impuestos' },
  { value: 'INDUMENTARIA', label: 'Indumentaria' },
  { value: 'LIBRERIA', label: 'Librería' },
  { value: 'LIMPIEZA', label: 'Limpieza' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento del edificio' },
  { value: 'MATRICULA', label: 'Matrícula' },
  { value: 'SISTEMA', label: 'Sistema' },
  { value: 'SUELDOS', label: 'Sueldos' },
  { value: 'TELEFONO', label: 'Teléfono' },
]

export const FALLBACK_TIPOS_PAGO_PROVEEDOR: ParametroOption[] = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
]

export const FALLBACK_TIPOS_MOVIMIENTO_FONDOS: ParametroOption[] = [
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'EGRESO', label: 'Egreso' },
  { value: 'MOVIMIENTO', label: 'Movimiento' },
]

export const FALLBACK_CONCEPTOS_FONDOS: ParametroOption[] = [
  { value: 'CHEQUE_ACREDITADO', label: 'Cheque acreditado' },
  { value: 'CHEQUE_DEBITADO', label: 'Cheque debitado' },
  { value: 'COBRANZA_DE_CLIENTES', label: 'Cobranza de clientes' },
  { value: 'COMPRA_USD', label: 'Compra USD' },
  { value: 'EXTRACCION', label: 'Extracción' },
  { value: 'GASTOS_BANCARIOS', label: 'Gastos bancarios' },
  { value: 'IMPUESTO_DEBITOS_CREDITOS', label: 'Impuesto débitos/créditos' },
  { value: 'OTROS_INGRESOS', label: 'Otros ingresos' },
  { value: 'PAGO_A_PROVEEDORES', label: 'Pago a proveedores' },
  { value: 'SALDO_INICIAL', label: 'Saldo inicial' },
  { value: 'SUELDOS', label: 'Sueldos' },
  { value: 'VENTA_USD', label: 'Venta USD' },
  { value: 'APORTE_TARALO', label: 'Aporte a Tarallo' },
  { value: 'RETIRO_TARALO', label: 'Retiro de Tarallo' },
  { value: 'MOVIMIENTO', label: 'Movimiento' },
]

export const FALLBACK_CONCEPTOS_HABER_EMPLEADA: ParametroOption[] = [
  { value: 'Sueldo fijo', label: 'Sueldo fijo' },
  { value: 'Premio', label: 'Premio' },
  { value: 'Aguinaldo', label: 'Aguinaldo' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Honorario anual', label: 'Honorario anual' },
  { value: 'Estados contables', label: 'Estados contables' },
  { value: 'Ganancias y bienes personales', label: 'Ganancias y bienes personales' },
  { value: 'Saldo técnico IVA', label: 'Saldo técnico IVA' },
  { value: 'Otro', label: 'Otro' },
]

export const FALLBACK_CONCEPTOS_DESCUENTO_EMPLEADA: ParametroOption[] = [
  { value: 'IIBB', label: 'IIBB' },
  { value: 'Monotributo', label: 'Monotributo' },
  { value: 'Otro', label: 'Otro' },
]
