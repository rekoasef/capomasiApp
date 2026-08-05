import { useQuery } from '@tanstack/react-query'
import { facturacionHistoricaService } from '../services/facturacionHistoricaService'

export function useFacturacionHistorica() {
  return useQuery({
    queryKey: ['facturacion_historica'],
    queryFn: async () => {
      const r = await facturacionHistoricaService.getAll()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}
