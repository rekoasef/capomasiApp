import {
  descripcionComprobante,
  labelTipoComprobante,
  labelTipoServicio,
  legibleDesdeCodigo,
} from '@/shared/lib/etiquetas'

describe('labelTipoServicio', () => {
  it('traduce los códigos conocidos', () => {
    expect(labelTipoServicio('HONORARIO_MENSUAL')).toBe('Honorario mensual')
    expect(labelTipoServicio('SALDO_INICIAL')).toBe('Saldo inicial')
  })

  it('hace legible un código desconocido', () => {
    expect(labelTipoServicio('OTRO_SERVICIO_NUEVO')).toBe('Otro servicio nuevo')
  })

  it('devuelve vacío si no hay valor', () => {
    expect(labelTipoServicio(null)).toBe('')
    expect(labelTipoServicio(undefined)).toBe('')
  })
})

describe('labelTipoComprobante', () => {
  it('traduce los tipos de comprobante', () => {
    expect(labelTipoComprobante('FC_A')).toBe('FC A')
    expect(labelTipoComprobante('PRESUPUESTO')).toBe('Presupuesto')
  })
})

describe('descripcionComprobante', () => {
  it('arma tipo + número como lo ve el cliente', () => {
    expect(descripcionComprobante('PRESUPUESTO', 'P-0100')).toBe('Presupuesto P-0100')
    expect(descripcionComprobante('FC_A', '0001-00001234')).toBe('FC A 0001-00001234')
  })

  it('muestra el tipo aunque todavía no haya número', () => {
    expect(descripcionComprobante('FC_C', null)).toBe('FC C')
    expect(descripcionComprobante('FC_C', '   ')).toBe('FC C')
  })

  it('muestra el número aunque no haya tipo', () => {
    expect(descripcionComprobante(null, 'A-0055')).toBe('A-0055')
  })

  it('devuelve vacío cuando no hay comprobante', () => {
    expect(descripcionComprobante(null, null)).toBe('')
  })
})

describe('legibleDesdeCodigo', () => {
  it('normaliza guiones bajos y mayúsculas', () => {
    expect(legibleDesdeCodigo('BIENES_PERSONALES')).toBe('Bienes personales')
    expect(legibleDesdeCodigo('')).toBe('')
  })
})
