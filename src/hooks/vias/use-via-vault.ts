import { useQuery } from '@tanstack/react-query'
import { api } from '@/src/lib/axios'
import type { ViaCaptureGroup } from '@/src/types/vias.types'

export function useViaVault(logId: string | null) {
  return useQuery({
    queryKey: ['via-vault', logId],
    queryFn: () => api.get<ViaCaptureGroup[]>(`/via-logs/${logId}/captures`).then((r) => r.data),
    enabled: !!logId,
    refetchInterval: 20000,
  })
}
