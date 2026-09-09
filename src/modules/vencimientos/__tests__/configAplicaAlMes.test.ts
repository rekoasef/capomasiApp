import { configAplicaAlMes } from '../services/configAplicaAlMes'

// La regla que hacía que los anticipos le aparecieran pendientes los 12
// meses del año: hasta la migración 0076 un trabajo recurrente solo podía
// ser MENSUAL (los 12, sin excepción) o ANUAL (uno solo).

describe('configAplicaAlMes', () => {
  describe('MENSUAL', () => {
    it('aplica a todos los meses del año', () => {
      const config = {
        tipo_vencimiento: 'MENSUAL',
        mes_vencimiento_anual: null,
        meses_vencimiento: null,
      }
      for (let mes = 1; mes <= 12; mes++) {
        expect(configAplicaAlMes(config, mes)).toBe(true)
      }
    })
  })

  describe('ANUAL', () => {
    it('aplica solo al mes configurado', () => {
      const config = {
        tipo_vencimiento: 'ANUAL',
        mes_vencimiento_anual: 5,
        meses_vencimiento: null,
      }
      expect(configAplicaAlMes(config, 5)).toBe(true)
      expect(configAplicaAlMes(config, 4)).toBe(false)
      expect(configAplicaAlMes(config, 6)).toBe(false)
    })
  })

  describe('MESES_ESPECIFICOS', () => {
    // Anticipos de ganancias, persona física: 5 al año.
    const anticiposPF = {
      tipo_vencimiento: 'MESES_ESPECIFICOS',
      mes_vencimiento_anual: null,
      meses_vencimiento: [8, 10, 12, 2, 4],
    }

    it('aplica solo a los meses marcados', () => {
      for (const mes of [8, 10, 12, 2, 4]) {
        expect(configAplicaAlMes(anticiposPF, mes)).toBe(true)
      }
    })

    it('no aplica a los meses sin marcar', () => {
      for (const mes of [1, 3, 5, 6, 7, 9, 11]) {
        expect(configAplicaAlMes(anticiposPF, mes)).toBe(false)
      }
    })

    it('genera exactamente 5 vencimientos al año en persona física', () => {
      const meses = Array.from({ length: 12 }, (_, i) => i + 1)
      expect(meses.filter((m) => configAplicaAlMes(anticiposPF, m))).toHaveLength(5)
    })

    it('genera exactamente 9 vencimientos al año en sociedades', () => {
      const anticiposSociedad = {
        tipo_vencimiento: 'MESES_ESPECIFICOS',
        mes_vencimiento_anual: null,
        meses_vencimiento: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      }
      const meses = Array.from({ length: 12 }, (_, i) => i + 1)
      expect(meses.filter((m) => configAplicaAlMes(anticiposSociedad, m))).toHaveLength(9)
    })

    it('no genera nada si todavía no se marcó ningún mes', () => {
      const sinMeses = {
        tipo_vencimiento: 'MESES_ESPECIFICOS',
        mes_vencimiento_anual: null,
        meses_vencimiento: null,
      }
      const meses = Array.from({ length: 12 }, (_, i) => i + 1)
      expect(meses.filter((m) => configAplicaAlMes(sinMeses, m))).toHaveLength(0)
    })
  })

  describe('A_DEMANDA', () => {
    it('nunca se genera automáticamente: la fecha la pone Paola', () => {
      const config = {
        tipo_vencimiento: 'A_DEMANDA',
        mes_vencimiento_anual: null,
        meses_vencimiento: null,
      }
      for (let mes = 1; mes <= 12; mes++) {
        expect(configAplicaAlMes(config, mes)).toBe(false)
      }
    })
  })
})
