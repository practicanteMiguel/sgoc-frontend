import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/lib/axios';
import { useAuthStore } from '@/src/stores/auth.store';
import type { Notification } from '@/src/types/module.types';
import { toast } from 'sonner';

interface NotificationsResponse {
  data:   Notification[];
  total:  number;
  unread: number;
}

// Lista completa de mis notificaciones
export function useNotifications(onlyUnread = false) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['notifications', { onlyUnread }],
    queryFn:  () =>
      api
        .get<NotificationsResponse>(`/notifications${onlyUnread ? '?unread=true' : ''}`)
        .then((r) => r.data),
    enabled:   isAuthenticated,
    refetchInterval: 15 * 1000, 
  });
}

// Contador de no leídas — badge del header
export function useUnreadCount() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn:  () =>
      api.get<{count: number}>('/notifications/unread-count').then((r) => r.data),
    enabled:         isAuthenticated,
    refetchInterval: 15 * 1000,
  });
}

// Marcar una notificación como leída
export function useMarkAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Marcar todas como leídas
export function useMarkAllAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Enviar mensaje a un usuario
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
      toast.success('Notificación enviada');
    },
  });
}