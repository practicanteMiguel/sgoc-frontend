'use client';

import { useState } from 'react';
import { User, ShieldCheck, Send, Bell } from 'lucide-react';
import { useUnreadCount } from '@/src/hooks/settings/use-notifications';
import { ProfileTab }       from './profile-tab';
import { PasswordTab }       from './password-tab';
import { MessagingTab }      from './messaging-tab';
import { NotificationsTab }  from './notifications-tab';

type Tab = 'profile' | 'password' | 'messaging' | 'notifications';

export function SettingsView() {
  const [active, setActive]       = useState<Tab>('profile');
  const { data: unreadData }       = useUnreadCount();
  const unread                     = unreadData?.count ?? 0;

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'profile',       label: 'Mi perfil',       icon: User         },
    { id: 'password',      label: 'Contraseña',      icon: ShieldCheck  },
    { id: 'messaging',     label: 'Enviar mensaje',  icon: Send         },
    { id: 'notifications', label: 'Notificaciones', icon: Bell, badge: unread  },
  ];

  return (
    <div className="max-w-8xl p-10 mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold"
            style={{ color: 'var(--color-secundary)' }}>
          Configuración
        </h2>
        <p className="text-sm mt-0.5"
           style={{ color: 'var(--color-text-400)' }}>
          Gestioná tu perfil, seguridad y comunicaciones
        </p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">

  
        <div className="lg:w-52 shrink-0">
          <nav
            className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible"
            style={{
              background:   'var(--color-surface-0)',
              border:       '1px solid var(--color-border)',
              borderRadius: '12px',
              padding:      '6px',
            }}
          >
            {tabs.map(({ id, label, icon: Icon, badge = 0 }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left whitespace-nowrap relative"
                style={
                  active === id
                    ? { background: 'var(--color-primary)', color: '#fff' }
                    : { color: 'var(--color-text-600)' }
                }
                onMouseEnter={(e) => {
                  if (active !== id) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (active !== id) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <Icon size={15} className="shrink-0" />
                {label}
                {badge > 0 && (
                  <span
                    className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full font-mono"
                    style={{
                      background: active === id ? 'rgba(255,255,255,0.3)' : 'var(--color-secondary)',
                      color:      '#fff',
                      fontSize:   '10px',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

   
        <div className="flex-1 min-w-0 animate-fade-in">
          {active === 'profile'       && <ProfileTab />}
          {active === 'password'      && <PasswordTab />}
          {active === 'messaging'     && <MessagingTab />}
          {active === 'notifications' && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}