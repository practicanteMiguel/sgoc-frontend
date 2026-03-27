'use client';

import { useState } from 'react';
import { Shield, Users2, Lock, Settings, Loader2 } from 'lucide-react';
import { useRoles } from '@/src/hooks/users/use-roles';
import { RolePermissionsMatrix } from './role-permissions-matrix';
import type { Role } from '@/src/types/user.types';

const ROLE_ICONS: Record<string, any> = {
  admin:          Lock,
  coordinator:    Settings,
  module_manager: Users2,
  supervisor:     Shield,
};

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  admin:          { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   border: 'rgba(220,38,38,0.2)'   },
  coordinator:    { bg: 'var(--color-info-bg)',     color: 'var(--color-info)',     border: 'rgba(29,78,216,0.2)'   },
  module_manager: { bg: 'var(--color-secondary-muted)', color: 'var(--color-secondary)', border: 'rgba(255,95,3,0.2)'    },
  supervisor:     { bg: 'var(--color-success-bg)',   color: 'var(--color-success)',   border: 'rgba(22,163,74,0.2)'  },
};

export function RolesView() {
  const { data: roles, isLoading } = useRoles();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">

      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold"
            style={{ color: 'var(--color-secundary)' }}>
          Roles y Permisos
        </h2>
        <p className="text-sm mt-0.5"
           style={{ color: 'var(--color-text-400)' }}>
          Gestioná los permisos de cada rol. Hacé click en un rol para ver y editar su matriz de permisos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin"
            style={{ color: 'var(--color-secondary)' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {roles?.map((role) => {
            const Icon    = ROLE_ICONS[role.slug] ?? Shield;
            const colors  = ROLE_COLORS[role.slug] ?? ROLE_COLORS.supervisor;
            const permCount = role.role_permissions?.length ?? 0;

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className="text-left p-5 rounded-xl transition-all duration-200 animate-fade-in"
                style={{
                  background: 'var(--color-surface-0)',
                  border:     '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = colors.color;
                  el.style.transform   = 'translateY(-2px)';
                  el.style.boxShadow   = `0 4px 16px ${colors.border}`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--color-border)';
                  el.style.transform   = 'translateY(0)';
                  el.style.boxShadow   = 'none';
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: colors.bg, color: colors.color }}
                  >
                    <Icon size={18} />
                  </div>
                  {role.is_system && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-mono"
                      style={{
                        background: 'var(--color-surface-2)',
                        color:      'var(--color-text-400)',
                        border:     '1px solid var(--color-border)',
                      }}
                    >
                      sistema
                    </span>
                  )}
                </div>

                <p className="font-display font-semibold text-base mb-1"
                   style={{ color: 'var(--color-secundary)' }}>
                  {role.name}
                </p>
                <p className="text-xs mb-3"
                   style={{ color: 'var(--color-text-400)' }}>
                  {role.description ?? 'Sin descripción'}
                </p>

                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-mono px-2.5 py-1 rounded-full"
                    style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
                  >
                    {role.slug === 'admin' ? 'Acceso total' : `${permCount} permisos`}
                  </span>
                  <span className="text-xs"
                        style={{ color: 'var(--color-secondary)' }}>
                    Ver permisos →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedRole && (
        <RolePermissionsMatrix
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
        />
      )}
    </div>
  );
}