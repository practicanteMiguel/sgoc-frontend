'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Pencil, Trash2, LogIn, LogOut, Activity, Monitor } from 'lucide-react';
import { MODULE_CONFIG } from '@/src/config/modules.config';
import type { AuditLog } from '@/src/hooks/monitoring/use-audit-log';

const ACTION_CONFIG: Record<string, {
  label:  string;
  icon:   React.ElementType;
  color:  string;
  bg:     string;
  border: string;
}> = {
  CREATE: { label: 'Creacion',        icon: Plus,     color: 'var(--color-success)',    bg: 'var(--color-success-bg)',   border: 'rgba(22,163,74,0.2)'  },
  UPDATE: { label: 'Actualizacion',   icon: Pencil,   color: 'var(--color-info)',       bg: 'var(--color-info-bg)',      border: 'rgba(29,78,216,0.2)'  },
  DELETE: { label: 'Eliminacion',     icon: Trash2,   color: 'var(--color-danger)',     bg: 'var(--color-danger-bg)',    border: 'rgba(220,38,38,0.2)'  },
  LOGIN:  { label: 'Inicio de sesion',icon: LogIn,    color: 'var(--color-secondary)',  bg: 'var(--color-secondary-muted)', border: 'rgba(255,95,3,0.2)' },
  LOGOUT: { label: 'Cierre de sesion',icon: LogOut,   color: 'var(--color-text-400)',   bg: 'var(--color-surface-2)',    border: 'var(--color-border)'  },
};

const ENTITY_LABELS: Record<string, string> = {
  users: 'Usuario', vehicles: 'Vehiculo', consumables: 'Consumible',
  tools: 'Herramienta', equipment: 'Equipo', reports: 'Reporte',
  roles: 'Rol', modules: 'Modulo', sessions: 'Sesion',
};

const HIDDEN_FIELDS = new Set(['password', 'password_hash', 'temp_password', 'token', 'email_verification_token']);

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Nombre', last_name: 'Apellido', email: 'Correo', phone: 'Telefono',
  position: 'Cargo', role_slug: 'Rol', module: 'Modulo', field: 'Campo',
  is_active: 'Activo', is_core: 'Core', name: 'Nombre', slug: 'Slug', description: 'Descripcion',
};

function ValueBadge({ label, value }: { label: string; value: any }) {
  const display = value === null || value === undefined ? '—' : typeof value === 'boolean' ? (value ? 'Si' : 'No') : String(value);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-xs shrink-0" style={{ color: 'var(--color-text-400)' }}>{label}:</span>
      <span className="text-xs font-medium truncate px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-900)', border: '1px solid var(--color-border)' }}>
        {display}
      </span>
    </div>
  );
}

function ValuesGrid({ values }: { values: Record<string, any> | null }) {
  if (!values) return null;
  const entries = Object.entries(values).filter(([k]) => !HIDDEN_FIELDS.has(k));
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
      {entries.map(([key, val]) => <ValueBadge key={key} label={FIELD_LABELS[key] ?? key} value={val} />)}
    </div>
  );
}

export function AuditLogItem({ log }: { log: AuditLog }) {
  const actionCfg  = ACTION_CONFIG[log.action] ?? { label: log.action, icon: Activity, color: 'var(--color-text-400)', bg: 'var(--color-surface-2)', border: 'var(--color-border)' };
  const ActionIcon = actionCfg.icon;
  const moduleCfg  = MODULE_CONFIG[log.module];
  const ModuleIcon = moduleCfg?.icon ?? Monitor;
  const userName   = log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Sistema';
  const timeAgo    = formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es });

  return (
    <div
      className="flex gap-3 p-4 rounded-xl transition-all duration-150"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = actionCfg.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${actionCfg.border}`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: actionCfg.bg, color: actionCfg.color }}>
        <ActionIcon size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full" style={{ background: actionCfg.bg, color: actionCfg.color, border: `1px solid ${actionCfg.border}` }}>
              {actionCfg.label}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-400)' }}>
              <ModuleIcon size={11} />{moduleCfg?.label ?? log.module}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}>
              {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
            </span>
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--color-text-400)' }}>{timeAgo}</span>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>{userName}</span>
          {log.user?.email && <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{log.user.email}</span>}
          {log.ip_address && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}>
              {log.ip_address}
            </span>
          )}
        </div>

        {(log.new_values || log.old_values) && (
          <div className="mt-2">
            {log.action === 'UPDATE' && log.old_values && log.new_values ? (
              <div className="flex flex-col gap-1">
                {Object.keys(log.new_values)
                  .filter((k) => !HIDDEN_FIELDS.has(k) && log.old_values![k] !== log.new_values![k])
                  .map((k) => (
                    <div key={k} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{FIELD_LABELS[k] ?? k}:</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded line-through" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                        {String(log.old_values![k] ?? '—')}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>→</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                        {String(log.new_values![k] ?? '—')}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <ValuesGrid values={log.new_values ?? log.old_values} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
