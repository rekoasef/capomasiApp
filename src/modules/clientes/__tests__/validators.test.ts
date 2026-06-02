import { validarCuit } from '@/shared/utils/validators'

// CUITs válidos (verificados con el algoritmo):
// 20123456786 → sum=148, rem=5, check=6 ✅
// 27123456780 → sum=176, rem=0, check=0 ✅
// 30500010912 → sum=64,  rem=9, check=2 ✅

describe('validarCuit', () => {
  it('valida CUITs correctos', () => {
    expect(validarCuit('20123456786')).toBe(true)
    expect(validarCuit('27123456780')).toBe(true)
    expect(validarCuit('30500010912')).toBe(true)
  })

  it('rechaza CUITs con dígito verificador incorrecto', () => {
    expect(validarCuit('20123456780')).toBe(false)
    expect(validarCuit('20123456789')).toBe(false)
  })

  it('rechaza strings con menos de 11 dígitos', () => {
    expect(validarCuit('2012345678')).toBe(false)
  })

  it('rechaza strings con letras', () => {
    expect(validarCuit('2012345678X')).toBe(false)
  })

  it('rechaza string vacío', () => {
    expect(validarCuit('')).toBe(false)
  })
})
