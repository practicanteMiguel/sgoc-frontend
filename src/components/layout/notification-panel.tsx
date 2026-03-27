'use client';

import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/src/hooks/dashboard/use-notifications';
import { formatDate } from '@/src/lib/utils';

const PRIORITY_STYLES: Record<string, { dot: string; label: string }> = {
  low:    { dot: 'var(--color-info)',    label: 'Informativo' },
  medium: { dot: 'var(--color-warning)', label: 'Media'       },
  high:   { dot: 'var(--color-danger)',  label: 'Urgente'     },
};

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { data, isLoading }  = useNotifications();
  const markOne              = useMarkAsRead();
  const markAll              = useMarkAllAsRead();

  const notifications = data?.data ?? [];
  const unread        = data?.unread ?? 0;

  return (
    <div
      className="absolute right-0 top-12 w-80 rounded-xl overflow-hidden animate-fade-in z-50"
      style={{
        background: 'var(--color-surface-0)',
        border:     '1px solid var(--color-border)',
        boxShadow:  '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header del panel */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Bell size={15} style={{ color: 'var(--color-text-900)' }} />
          <span className="text-sm font-semibold font-mono"
                style={{ color: 'var(--color-text-900)' }}>
            Notificaciones
          </span>
          {unread > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: 'var(--color-brand)', color: '#fff' }}
            >
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-brand)' }}
          >
            <CheckCheck size={13} /> Leer todas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin"
              style={{ color: 'var(--color-text-400)' }} />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-2">
            <Bell size={28} style={{ color: 'var(--color-text-200)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              Sin notificaciones
            </p>
          </div>
        )}

        {notifications.map((n) => {
          const style = PRIORITY_STYLES[n.priority] ?? PRIORITY_STYLES.low;
          return (
            <div
              key={n.id}
              className="px-4 py-3 flex gap-3 cursor-pointer transition-colors"
              style={{
                borderBottom:  '1px solid var(--color-border)',
                background:    !n.is_read ? 'var(--color-surface-1)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  !n.is_read ? 'var(--color-surface-1)' : 'transparent';
              }}
              onClick={() => { if (!n.is_read) markOne.mutate(n.id); }}
            >
              {/* Dot de prioridad */}
              <div className="mt-1.5 shrink-0">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: !n.is_read ? style.dot : 'var(--color-border)' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: 'var(--color-text-900)' }}
                >
                  {n.title}
                </p>
                <p
                  className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                  style={{ color: 'var(--color-text-400)' }}
                >
                  {n.message}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-200)' }}>
                    {n.sender
                      ? `${n.sender.first_name} ${n.sender.last_name}`
                      : 'Sistema'}
                  </span>
                  <span className="text-xs font-mono"
                        style={{ color: 'var(--color-text-200)' }}>
                    {formatDate(n.created_at)}
                  </span>
                </div>
              </div>
              {!n.is_read && (
                <Check size={12} className="shrink-0 mt-1"
                  style={{ color: 'var(--color-text-200)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}