import {
  agruparClavesPorCliente,
  nombreArchivoClaves,
  nombreArchivoTodasLasClaves,
  prepararClavesParaPdf,
} from '../services/clavesPdfService'
import type { TClave } from '../types'

const clave = (over: Partial<TClave>): TClave => ({
  id: '1',
  cliente_id: 'c1',
  tipo: 'AFIP',
  usuario: null,
  clave: 'secreta',
  notas: null,
  updated_at: '2026-10-07T00:00:00Z',
  updated_by: null,
  ...over,
})

describe('prepararClavesParaPdf', () => {
  const labels: Record<string, string> = { AFIP: 'AFIP', API: 'API Santa Fe', ANSES: 'ANSES' }
  const labelTipo = (code: string) => labels[code] ?? code

  it('reemplaza el código del tipo por su etiqueta y ordena por etiqueta', () => {
    const filas = prepararClavesParaPdf(
      [
        clave({ id: '1', tipo: 'API' }),
        clave({ id: '2', tipo: 'ANSES' }),
        clave({ id: '3', tipo: 'AFIP' }),
      ],
      labelTipo
    )
    expect(filas.map((f) => f.tipo)).toEqual(['AFIP', 'ANSES', 'API Santa Fe'])
  })

  it('conserva usuario, clave y notas', () => {
    const [fila] = prepararClavesParaPdf(
      [clave({ usuario: '20123456789', clave: 'Abc123', notas: 'cambia en marzo' })],
      labelTipo
    )
    expect(fila).toEqual({
      id: '1',
      tipo: 'AFIP',
      usuario: '20123456789',
      clave: 'Abc123',
      notas: 'cambia en marzo',
    })
  })

  it('usa el código si el tipo no tiene etiqueta', () => {
    const [fila] = prepararClavesParaPdf([clave({ tipo: 'OTRO' })], labelTipo)
    expect(fila.tipo).toBe('OTRO')
  })
})

describe('nombreArchivoClaves', () => {
  it('saca acentos y caracteres especiales', () => {
    expect(nombreArchivoClaves('SOC-MAR S.A.')).toBe('SOC_MAR_S_A_claves_fiscales.pdf')
    expect(nombreArchivoClaves('Ricciotti, Lucíano')).toBe('Ricciotti_Luciano_claves_fiscales.pdf')
  })

  it('usa un nombre genérico si no queda nada', () => {
    expect(nombreArchivoClaves('***')).toBe('cliente_claves_fiscales.pdf')
  })
})

describe('agruparClavesPorCliente', () => {
  const conCliente = (over: Partial<TClave>, nombre: string, cuit = '20123456789') => ({
    ...clave(over),
    clientes: { nombre, cuit },
  })

  it('agrupa por cliente y ordena los clientes alfabéticamente', () => {
    const grupos = agruparClavesPorCliente(
      [
        conCliente({ id: '1', cliente_id: 'b', tipo: 'AFIP' }, 'SOC-MAR S.A.'),
        conCliente({ id: '2', cliente_id: 'a', tipo: 'ANSES' }, 'Ardiles, Dario'),
        conCliente({ id: '3', cliente_id: 'b', tipo: 'API' }, 'SOC-MAR S.A.'),
      ],
      (code) => code
    )
    expect(grupos.map((g) => g.clienteNombre)).toEqual(['Ardiles, Dario', 'SOC-MAR S.A.'])
    expect(grupos[1].claves.map((c) => c.id)).toEqual(['1', '3'])
  })

  it('devuelve vacío sin claves', () => {
    expect(agruparClavesPorCliente([], (code) => code)).toEqual([])
  })
})

describe('nombreArchivoTodasLasClaves', () => {
  it('lleva la fecha del día', () => {
    expect(nombreArchivoTodasLasClaves(new Date(2026, 9, 7))).toBe('claves_fiscales_2026-10-07.pdf')
  })
})
