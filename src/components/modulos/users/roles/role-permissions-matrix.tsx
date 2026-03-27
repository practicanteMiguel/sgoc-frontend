'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Shield, Lock } from 'lucide-react';
import {
  useAllPermissions, useRolePermissions,
  useAddPermissions, useRemovePermissions,
} from '@/src/hooks/users/use-roles';
import { Role } from '@/src/types/user.types';
import { MODULE_CONFIG } from '@/src/config/modules.config';
import { ModalPortal } from '@/src/components/ui/modal-portal';

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;
const ACTION_LABELS: Record<string, string> = {
  view:   'Ver',
  create: 'Crear',
  edit:   'Editar',
  delete: 'Eliminar',
  export: 'Exportar',
};

interface Props {
  role:    Role;
  onClose: () => void;
}

export function RolePermissionsMatrix({ role, onClose }: Props) {
  const { data: allPerms }  = useAllPermissions();
  const { data: rolePerms } = useRolePermissions(role.id);
  const addPerms            = useAddPermissions();
  const removePerms         = useRemovePermissions();

  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (rolePerms?.permissions) {
      setActive(new Set(rolePerms.permissions.map((p: any) => p.slug)));
    }
  }, [rolePerms]);

  const modules   = Object.keys(MODULE_CONFIG);
  const isPending = addPerms.isPending || removePerms.isPending;
  const isAdmin   = role.slug === 'admin';

  const toggle = async (moduleSlug: string, action: string) => {
    if (isAdmin) return;

    const slug    = `${moduleSlug}.${action}`;
    const viewSlug = `${moduleSlug}.view`;
    const hasView  = active.has(viewSlug);

    // Si intenta activar cualquier acción sin tener "ver" → bloquear
    if (action !== 'view' && !hasView && !active.has(slug)) return;

    if (action === 'view' && active.has(slug)) {
      // Quitar "ver" → limpiar también todos los demás permisos del módulo
      const toRemove = ACTIONS
        .map((a) => `${moduleSlug}.${a}`)
        .filter((s) => active.has(s));

      removePerms.mutate(
        { roleId: role.id, permissions: toRemove },
        {
          onSuccess: () =>
            setActive((prev) => {
              const n = new Set(prev);
              toRemove.forEach((s) => n.delete(s));
              return n;
            }),
        },
      );
    } else if (active.has(slug)) {
      // Quitar permiso individual
      removePerms.mutate(
        { roleId: role.id, permissions: [slug] },
        { onSuccess: () => setActive((prev) => { const n = new Set(prev); n.delete(slug); return n; }) },
      );
    } else {
      // Agregar permiso individual
      addPerms.mutate(
        { roleId: role.id, permissions: [slug] },
        { onSuccess: () => setActive((prev) => new Set([...prev, slug])) },
      );
    }
  };

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-3xl rounded-xl  flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '88vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-primary-muted)', color: 'var(--color-secundary)' }}
            >
              <Shield size={18} />
            </div>
            <div>
              <p className="font-display font-semibold text-base"
                 style={{ color: 'var(--color-secundary)' }}>
                Permisos — {role.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                {isAdmin
                  ? 'El rol administrador tiene acceso total'
                  : 'Activá "Ver" para habilitar los demás permisos del módulo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 size={14} className="animate-spin"
              style={{ color: 'var(--color-secondary)' }} />}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
              style={{ color: 'var(--color-text-400)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead>
              <tr style={{
                background:   'var(--color-surface-1)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <th className="px-5 py-3 text-left text-xs font-mono uppercase tracking-wider w-40"
                    style={{ color: 'var(--color-text-400)' }}>
                  Módulo
                </th>
                {ACTIONS.map((a) => (
                  <th key={a}
                      className="px-2 py-3 text-center text-xs font-mono uppercase tracking-wider"
                      style={{ color: 'var(--color-text-400)' }}>
                    {ACTION_LABELS[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((moduleSlug, idx) => {
                const cfg     = MODULE_CONFIG[moduleSlug];
                const Icon    = cfg.icon;
                const hasView = isAdmin || active.has(`${moduleSlug}.view`);

                return (
                  <tr
                    key={moduleSlug}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background:   idx % 2 === 0
                        ? 'var(--color-surface-0)'
                        : 'var(--color-surface-1)',
                    }}
                  >
                    {/* Módulo */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Icon
                          size={14}
                          style={{ color: hasView ? 'var(--color-secondary)' : 'var(--color-border)' }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: hasView ? 'var(--color-text-600)' : 'var(--color-text-400)', opacity: hasView ? 1 : 0.5 }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </td>

                    {/* Acciones */}
                    {ACTIONS.map((action) => {
                      const slug    = `${moduleSlug}.${action}`;
                      const exists  = allPerms?.some((p) => p.slug === slug);
                      const checked = isAdmin || active.has(slug);
                      // Bloqueado si no tiene "ver" y no es la acción "ver"
                      const blocked = !isAdmin && action !== 'view' && !hasView;

                      if (!exists) {
                        return (
                          <td key={action} className="px-2 py-3 text-center">
                            <span style={{ color: 'var(--color-border)' }}>—</span>
                          </td>
                        );
                      }

                      return (
                        <td key={action} className="px-2 py-3 text-center">
                          <button
                            onClick={() => toggle(moduleSlug, action)}
                            disabled={isAdmin || isPending || blocked}
                            className="w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all"
                            style={{
                              background: isAdmin || checked
                                ? 'var(--color-secondary)'
                                : blocked
                                  ? 'var(--color-surface-2)'
                                  : 'var(--color-surface-2)',
                              border: isAdmin || checked
                                ? '1.5px solid var(--color-secondary)'
                                : '1.5px solid var(--color-border)',
                              cursor:  isAdmin || blocked ? 'not-allowed' : 'pointer',
                              opacity: blocked ? 0.3 : isPending ? 0.6 : 1,
                            }}
                            title={
                              isAdmin  ? 'Acceso total' :
                              blocked  ? 'Activá "Ver" primero' :
                              checked  ? 'Quitar permiso' : 'Dar permiso'
                            }
                          >
                            {isAdmin
                              ? <Lock size={10} color="#fff" />
                              : checked
                                ? <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>
                                : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModalPortal>
  );
}