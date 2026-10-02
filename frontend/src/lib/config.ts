import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { PublicConfig } from './types'

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api<PublicConfig>('/api/config', { auth: false }),
    staleTime: 10 * 60 * 1000,
  })
}
