'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Layers, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  useUserModuleAccess,
  useAssignUserModule,
  useRevokeUserModule,
  useClearUserModuleAccess,
  type UserAccessPerms,
} from '@/src/hooks/users/use-user-module-access';
import { MODULE_CONFIG } from '@/src/config/modules.config';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import type { User } from '@/src/types/user.types';

const PERMS = ['create', 'edit', 'delete', 'export'] as const;
const PERM_LABELS: Record<string, string> = {
  create: 'Crear',
  edit:   'Editar',
  delete: 'Eliminar',
  export: 'Exportar',
};

type AccessMap = Record<string, UserAccessPerms>;

interface Props {
  user:    User;
  onClose: () => void;
}

export function UserModuleAccessMatrix({ user, onClose }: Props) {
  const { data: accesses, isLoading } = useUserModuleAccess(user.id);
  const assign                        = useAssignUserModule();
  const revoke                        = useRevokeUserModule();
  const clearAll                      = useClearUserModuleAccess();

  const [accessMap, setAccessMap]       = useState<AccessMap>({});
  const [confirmClear, setConfirmClear] = useState(false);

  // Sincronizar estado local con datos del servidor
  useEffect(() => {
    if (accesses) {
      const map: AccessMap = {};
      accesses.forEach((a) => {
        map[a.module_slug] = {
          can_create: a.can_create,
          can_edit:   a.can_edit,
          can_delete: a.can_delete,
          can_export: a.can_export,
        };
      });
      setAccessMap(map);
    }
  }, [accesses]);

  const modules       = Object.keys(MODULE_CONFIG);
  const hasIndividual = Object.keys(accessMap).length > 0;
  const isPending     = assign.isPending || revoke.isPending || clearAll.isPending;

  // Toggle acceso al módulo (asignar o revocar)
  const toggleModule = (moduleSlug: string) => {
    if (moduleSlug in accessMap) {
      // Revocar
      revoke.mutate(
        { userId: user.id, moduleSlug },
        {
          onSuccess: () =>
            setAccessMap((prev) => {
              const n = { ...prev };
              delete n[moduleSlug];
              return n;
            }),
        },
      );
    } else {
      // Asignar con todos los permisos en false
      const perms: UserAccessPerms = { can_create: false, can_edit: false, can_delete: false, can_export: false };
      assign.mutate(
        { userId: user.id, moduleSlug, permissions: perms },
        {
          onSuccess: () =>
            setAccessMap((prev) => ({ ...prev, [moduleSlug]: perms })),
        },
      );
    }
  };

  // Toggle un permiso dentro de un módulo ya asignado
  const togglePerm = (moduleSlug: string, perm: keyof UserAccessPerms) => {
    if (!(moduleSlug in accessMap)) return;
    const current  = accessMap[moduleSlug];
    const newPerms = { ...current, [perm]: !current[perm] };
    assign.mutate(
      { userId: user.id, moduleSlug, permissions: newPerms },
      {
        onSuccess: () =>
          setAccessMap((prev) => ({ ...prev, [moduleSlug]: newPerms })),
      },
    );
  };

  const handleClearAll = () => {
    clearAll.mutate(
      { userId: user.id },
      {
        onSuccess: () => {
          setAccessMap({});
          setConfirmClear(false);
        },
      },
    );
  };

  const fullName = `${user.first_name} ${user.last_name}`;

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-3xl rounded-xl flex flex-col"
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
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p
                  className="font-display font-semibold text-base"
                  style={{ color: 'var(--color-secundary)' }}
                >
                  Accesos — {fullName}
                </p>
                {/* Indicador de fuente de permisos */}
                {!isLoading && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={
                      hasIndividual
                        ? {
                            background: 'var(--color-secondary-muted)',
                            color:      'var(--color-secondary)',
                            border:     '1px solid rgba(255,95,3,0.25)',
                          }
                        : {
                            background: 'var(--color-info-bg)',
                            color:      'var(--color-info)',
                            border:     '1px solid rgba(29,78,216,0.2)',
                          }
                    }
                  >
                    {hasIndividual ? 'Permisos individuales' : 'Usando permisos del rol'}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                Activá el acceso a un módulo para asignar permisos individuales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPending && (
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
            )}
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
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background:   'var(--color-surface-1)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <th
                    className="px-5 py-3 text-left text-xs font-mono uppercase tracking-wider w-44"
                    style={{ color: 'var(--color-text-400)' }}
                  >
                    Módulo
                  </th>
                  <th
                    className="px-2 py-3 text-center text-xs font-mono uppercase tracking-wider"
                    style={{ color: 'var(--color-text-400)' }}
                  >
                    Acceso
                  </th>
                  {PERMS.map((p) => (
                    <th
                      key={p}
                      className="px-2 py-3 text-center text-xs font-mono uppercase tracking-wider"
                      style={{ color: 'var(--color-text-400)' }}
                    >
                      {PERM_LABELS[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((moduleSlug, idx) => {
                  const cfg        = MODULE_CONFIG[moduleSlug];
                  const Icon       = cfg.icon;
                  const isAssigned = moduleSlug in accessMap;
                  const perms      = accessMap[moduleSlug];

                  return (
                    <tr
                      key={moduleSlug}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background:
                          idx % 2 === 0
                            ? 'var(--color-surface-0)'
                            : 'var(--color-surface-1)',
                      }}
                    >
                      {/* Módulo */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            size={14}
                            style={{
                              color: isAssigned
                                ? 'var(--color-secondary)'
                                : 'var(--color-border)',
                            }}
                          />
                          <span
                            className="text-sm font-medium"
                            style={{
                              color:   isAssigned ? 'var(--color-text-600)' : 'var(--color-text-400)',
                              opacity: isAssigned ? 1 : 0.5,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </td>

                      {/* Acceso (asignar / revocar módulo) */}
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => toggleModule(moduleSlug)}
                          disabled={isPending}
                          className="w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all"
                          style={{
                            background: isAssigned ? 'var(--color-secondary)' : 'var(--color-surface-2)',
                            border:     isAssigned
                              ? '1.5px solid var(--color-secondary)'
                              : '1.5px solid var(--color-border)',
                            cursor:  isPending ? 'not-allowed' : 'pointer',
                            opacity: isPending ? 0.6 : 1,
                          }}
                          title={isAssigned ? 'Quitar acceso al módulo' : 'Dar acceso al módulo'}
                        >
                          {isAssigned && (
                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                              ✓
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Permisos individuales */}
                      {PERMS.map((permKey) => {
                        const fullKey = `can_${permKey}` as keyof UserAccessPerms;
                        const checked = isAssigned && !!perms?.[fullKey];
                        const blocked = !isAssigned;

                        return (
                          <td key={permKey} className="px-2 py-3 text-center">
                            <button
                              onClick={() => togglePerm(moduleSlug, fullKey)}
                              disabled={blocked || isPending}
                              className="w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all"
                              style={{
                                background: checked ? 'var(--color-secondary)' : 'var(--color-surface-2)',
                                border:     checked
                                  ? '1.5px solid var(--color-secondary)'
                                  : '1.5px solid var(--color-border)',
                                cursor:  blocked || isPending ? 'not-allowed' : 'pointer',
                                opacity: blocked ? 0.25 : isPending ? 0.6 : 1,
                              }}
                              title={
                                blocked
                                  ? 'Activá el acceso al módulo primero'
                                  : checked
                                    ? 'Quitar permiso'
                                    : 'Dar permiso'
                              }
                            >
                              {checked && (
                                <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                                  ✓
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer — Restablecer al rol */}
        {hasIndividual && (
          <div
            className="px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            {confirmClear ? (
              /* Confirmación inline */
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'var(--color-danger-bg)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <AlertTriangle size={15} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                <p className="text-xs flex-1" style={{ color: 'var(--color-danger)' }}>
                  Se eliminarán todos los accesos individuales. El usuario volverá a usar los permisos de su rol.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: 'var(--color-surface-2)',
                      color:      'var(--color-text-600)',
                      border:     '1px solid var(--color-border)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={clearAll.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      background: 'var(--color-danger)',
                      color:      '#fff',
                      opacity:    clearAll.isPending ? 0.6 : 1,
                    }}
                  >
                    {clearAll.isPending && <Loader2 size={11} className="animate-spin" />}
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{
                  color:      'var(--color-text-400)',
                  border:     '1px solid var(--color-border)',
                  background: 'var(--color-surface-1)',
                }}
              >
                <RotateCcw size={13} />
                Restablecer al rol
              </button>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
