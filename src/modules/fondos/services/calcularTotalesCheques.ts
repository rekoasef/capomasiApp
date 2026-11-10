import type { TCheque } from '@/modules/cobranzas/types'

export type TChequeParaTotales = Pick<
  TCheque,
  'tipo' | 'estado' | 'importe' | 'acreditacion_confirmada'
>

export interface TTotalesCheques {
  /** Cheques de terceros que Paola tiene en la mano. */
  enCartera: number
  /** Depositados que todavía no se tildaron como acreditados: siguen en la tarjeta de cartera. */
  depositadosSinAcreditar: number
  /** enCartera + depositadosSinAcreditar: lo que debería decir la tarjeta "Cheques en cartera". */
  totalCartera: number
  /** Cheques propios emitidos que el banco todavía no debitó. No son plata de la cartera. */
  emitidosSinDebitar: number
}

export function esDepositadoSinAcreditar(c: TChequeParaTotales): boolean {
  return c.tipo === 'TERCERO' && c.estado === 'DEPOSITADO' && !c.acreditacion_confirmada
}

export function calcularTotalesCheques(cheques: TChequeParaTotales[]): TTotalesCheques {
  let enCartera = 0
  let depositadosSinAcreditar = 0
  let emitidosSinDebitar = 0

  for (const c of cheques) {
    const importe = Number(c.importe) || 0
    if (c.tipo === 'PROPIO') {
      if (c.estado === 'EN_CARTERA' && !c.acreditacion_confirmada) emitidosSinDebitar += importe
    } else if (c.estado === 'EN_CARTERA') {
      enCartera += importe
    } else if (esDepositadoSinAcreditar(c)) {
      depositadosSinAcreditar += importe
    }
  }

  const redondear = (n: number) => Math.round(n * 100) / 100
  return {
    enCartera: redondear(enCartera),
    depositadosSinAcreditar: redondear(depositadosSinAcreditar),
    totalCartera: redondear(enCartera + depositadosSinAcreditar),
    emitidosSinDebitar: redondear(emitidosSinDebitar),
  }
}
