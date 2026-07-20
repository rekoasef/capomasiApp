import { useQuery } from '@tanstack/react-query'
import { auditoriaService } from '../services/auditoriaService'

export function useAuditLog(opts?: { tabla?: string; limit?: number }) {
  return useQuery({
    queryKey: ['audit_log', opts],
    queryFn: async () => {
      const r = await auditoriaService.getAll(opts)
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}
