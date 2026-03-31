import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';
import { useAuthStore } from '@/src/stores/auth.store';
import type { Notification } from '@/src/types/module.types';

interface NotificationsResponse {
  data:   Notification[];
  total:  number;
  unread: number;
}

export function useNotifications(onlyUnread = false) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey:  ['notifications', { onlyUnread }],
    queryFn:   () =>
      api.get<NotificationsResponse>(
        `/notifications${onlyUnread ? '?unread=true' : ''}`
      ).then((r) => r.data),
    enabled:              isAuthenticated,
    staleTime:            60 * 1000,       
    refetchOnWindowFocus: true,           
  });
}

// Badge del header
export function useUnreadCount() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey:             ['notifications', 'unread-count'],
    queryFn:              () =>
      api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
    enabled:              isAuthenticated,
    staleTime:            60 * 1000,
    refetchOnWindowFocus: true,
   
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData(['notifications', { onlyUnread: false }]);
      qc.setQueryData(['notifications', { onlyUnread: false }],
        (old: NotificationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            unread: Math.max(0, old.unread - 1),
            data: old.data.map((n) =>
              n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
            ),
          };
        });
      qc.setQueryData(['notifications', 'unread-count'],
        (old: { count: number } | undefined) =>
          ({ count: Math.max(0, (old?.count ?? 1) - 1) }));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(['notifications', { onlyUnread: false }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}


export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then((r) => r.data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData(['notifications', { onlyUnread: false }]);
      qc.setQueryData(['notifications', { onlyUnread: false }],
        (old: NotificationsResponse | undefined) => {
          if (!old) return old;
          return { ...old, unread: 0,
            data: old.data.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })) };
        });
      qc.setQueryData(['notifications', 'unread-count'], { count: 0 });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(['notifications', { onlyUnread: false }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}


export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      recipient_id: string;
      title:        string;
      message:      string;
      priority:     'low' | 'medium' | 'high';
    }) => api.post('/notifications/send', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Mensaje enviado');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al enviar'));
    },
  });
}
