import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/axios';

export interface AuditUser {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
}

export interface AuditLog {
  id:          string;
  action:      'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | string;
  entity_type: string;
  entity_id:   string;
  module:      string;
  old_values:  Record<string, any> | null;
  new_values:  Record<string, any> | null;
  ip_address:  string;
  created_at:  string;
  user:        AuditUser | null;
}

export interface AuditLogsResponse {
  data:  AuditLog[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

export function useAuditLogs(page = 1, limit = 5) {
  return useQuery({
    queryKey: ['audit-logs', { page, limit }],
    queryFn:  () =>
      api
        .get<AuditLogsResponse>(`/audit-logs?page=${page}&limit=${limit}`)
        .then((r) => r.data),
    staleTime: 30 * 1000, 
    placeholderData: (prev) => prev, 
  });
}