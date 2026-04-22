import { useQuery } from '@tanstack/react-query'
import { api } from '@/src/lib/axios'
import type { VaultImage } from '@/src/types/activities.types'

export function useLogVault(logId: string | null) {
  return useQuery({
    queryKey: ['vault', logId],
    queryFn: () => api.get<VaultImage[]>(`/logbook/${logId}/vault`).then((r) => r.data),
    enabled: !!logId,
    refetchInterval: 15000,
  })
}
