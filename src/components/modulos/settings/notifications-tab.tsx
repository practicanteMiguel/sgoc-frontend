'use client';

import { Bell, CheckCheck, Trash2, Loader2, Check, BellOff, BellRing, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  useNotifications, useMarkAsRead,
  useMarkAllAsRead,
  usePushStatus,
  useSubscribeToPush,
  useUnsubscribeFromPush,
  usePushSubscriptions,
} from '@/src/hooks/settings/use-notifications';
import { formatDate } from '@/src/lib/utils';
import { api } from '@/src/lib/axios';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PRIORITY_CONFIG = {
  low:    { label: 'Info',    dot: 'var(--color-info)'    },
  medium: { label: 'Media',   dot: 'var(--color-warning)' },
  high:   { label: 'Urgente', dot: 'var(--color-danger)'  },
};

function PushPanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: status, isLoading: statusLoading } = usePushStatus();
  const { data: devices, isLoading: devicesLoading } = usePushSubscriptions();
  const subscribe   = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();

  const isSubscribed = status?.subscribed ?? false;
  const isSupported  = status?.supported ?? false;

  if (!mounted) return null;

  return (
    <div
      className="rounded-xl overflow-hidden mt-6"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <BellRing size={15} style={{ color: 'var(--color-secundary)' }} />
          <p className="text-xs font-mono uppercase tracking-widest"
             style={{ color: 'var(--color-text-400)' }}>
            Notificaciones Push
          </p>
        </div>

        {!statusLoading && isSupported && (
          <button
            onClick={() => isSubscribed ? unsubscribe.mutate() : subscribe.mutate()}
            disabled={subscribe.isPending || unsubscribe.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={
              isSubscribed
                ? { background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)' }
                : { background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }
            }
          >
            {(subscribe.isPending || unsubscribe.isPending)
              ? <Loader2 size={12} className="animate-spin" />
              : isSubscribed
                ? <BellOff size={12} />
                : <BellRing size={12} />}
            {isSubscribed ? 'Desactivar en este dispositivo' : 'Activar en este dispositivo'}
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        {statusLoading && (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
          </div>
        )}

        {!statusLoading && !isSupported && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-400)' }}>
            Este navegador no soporta notificaciones push.
          </p>
        )}

        {!statusLoading && isSupported && (
          <div className="flex items-start gap-3">
            <div
              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{ background: isSubscribed ? 'var(--color-success)' : 'var(--color-border)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                {isSubscribed ? 'Activo en este navegador' : 'Inactivo en este navegador'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                {isSubscribed
                  ? 'Recibirás notificaciones aunque la app esté cerrada.'
                  : 'Activá las notificaciones push para recibirlas aunque no estés en la plataforma.'}
              </p>
            </div>
          </div>
        )}

        {!devicesLoading && devices && devices.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-mono uppercase tracking-widest mb-2"
               style={{ color: 'var(--color-text-200)' }}>
              Dispositivos registrados
            </p>
            <div className="flex flex-col gap-1.5">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-surface-1)' }}
                >
                  <Monitor size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--color-text-600)' }}>
                    {d.user_agent ?? 'Dispositivo desconocido'}
                  </span>
                  <span className="text-xs font-mono shrink-0" style={{ color: 'var(--color-text-200)' }}>
                    {formatDate(d.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationsTab() {
  const { data, isLoading }  = useNotifications();
  const markOne              = useMarkAsRead();
  const markAll              = useMarkAllAsRead();
  const qc                   = useQueryClient();

  const notifications = data?.data ?? [];
  const unread        = data?.unread ?? 0;

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      toast.error('Error al eliminar la notificación');
    }
  };

  return (
    <div className="max-w-6xl">
      <PushPanel />

      <div
        className="rounded-xl overflow-hidden mt-6"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="md:flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Bell size={15} style={{ color: 'var(--color-secundary)' }} />
            <p className="text-xs font-mono uppercase tracking-widest"
               style={{ color: 'var(--color-text-400)' }}>
              Notificaciones
            </p>
            {unread > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 mt-2 rounded-full font-mono"
                style={{ background: 'var(--color-secondary)', color: '#fff' }}
              >
                {unread} sin leer
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-secondary)' }}
            >
              {markAll.isPending
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckCheck size={13} />}
              Marcar todas como leídas
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin"
              style={{ color: 'var(--color-secondary)' }} />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-2">
            <Bell size={32} style={{ color: 'var(--color-border-strong)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              No tenés notificaciones
            </p>
          </div>
        )}

        {!isLoading && notifications.map((n, i) => {
          const cfg = PRIORITY_CONFIG[n.priority] ?? PRIORITY_CONFIG.low;
          return (
            <div
              key={n.id}
              className="flex gap-3 px-5 py-4 group transition-colors"
              style={{
                borderBottom:  i < notifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                background:    !n.is_read ? 'var(--color-surface-1)' : 'transparent',
              }}
            >
              <div className="mt-1.5 shrink-0">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: !n.is_read ? cfg.dot : 'var(--color-border)' }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--color-text-900)' }}
                  >
                    {n.title}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: !n.is_read
                        ? `color-mix(in srgb, ${cfg.dot} 15%, transparent)`
                        : 'var(--color-surface-2)',
                      color: !n.is_read ? cfg.dot : 'var(--color-text-400)',
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p
                  className="text-sm mt-0.5 leading-relaxed"
                  style={{ color: 'var(--color-text-600)' }}
                >
                  {n.message}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-200)' }}>
                    {n.sender
                      ? `De: ${n.sender.first_name} ${n.sender.last_name}`
                      : 'Sistema'}
                  </span>
                  <span className="text-xs font-mono"
                        style={{ color: 'var(--color-text-200)' }}>
                    {formatDate(n.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!n.is_read && (
                  <button
                    onClick={() => markOne.mutate(n.id)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-success)' }}
                    title="Marcar como leída"
                  >
                    <Check size={13} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-danger)' }}
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
