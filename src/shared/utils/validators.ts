export function validarCuit(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false

  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const digits = cuit.split('').map(Number)
  const sum = factors.reduce((acc, f, i) => acc + f * digits[i], 0)
  const remainder = sum % 11
  const check = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder

  return check === digits[10]
}
