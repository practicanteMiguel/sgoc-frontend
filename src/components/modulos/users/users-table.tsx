'use client';

import { useState } from 'react';
import { Pencil, Trash2, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import { ConfirmDeleteModal } from './confirm-delete-modal';
import { formatDate, getInitials, ROLE_LABELS } from '@/src/lib/utils';
import type { User } from '@/src/types/user.types';

interface UsersTableProps {
  users:       User[];
  onEdit:      (user: User) => void;
  onResetPass: (user: User) => void;
}

export function UsersTable({ users, onEdit, onResetPass }: UsersTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 rounded-xl"
           style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
          No hay usuarios registrados
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden"
           style={{ border: '1px solid var(--color-border)' }}>

    
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                {['Usuario', 'Cargo', 'Rol', 'Estado', 'Último acceso', ''].map((h) => (
                  <th key={h}
                      className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider"
                      style={{ color: 'var(--color-text-400)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ background: 'var(--color-surface-0)' }}>
              {users.map((u) => {
                const roleSlug  = u.user_roles?.[0]?.role?.slug ?? '';
                const roleLabel = ROLE_LABELS[roleSlug] ?? roleSlug;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                          style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
                        >
                          {getInitials(u.first_name, u.last_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium"
                             style={{ color: 'var(--color-text-900)' }}>
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-xs"
                             style={{ color: 'var(--color-text-400)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm"
                            style={{ color: 'var(--color-text-600)' }}>{u.position}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: 'var(--color-secondary-muted)',
                          color:      'var(--color-secundary)',
                          border:     '1px solid rgba(7,44,44,0.15)',
                        }}
                      >
                        {roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.is_active
                          ? <><CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
                             <span className="text-xs" style={{ color: 'var(--color-success)' }}>Activo</span></>
                          : <><XCircle size={13} style={{ color: 'var(--color-danger)' }} />
                             <span className="text-xs" style={{ color: 'var(--color-danger)' }}>Inactivo</span></>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono"
                            style={{ color: 'var(--color-text-400)' }}>
                        {u.last_login_at ? formatDate(u.last_login_at) : 'Nunca'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => onEdit(u)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--color-text-400)' }}
                                title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => onResetPass(u)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--color-text-400)' }}
                                title="Resetear contraseña">
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
                          style={{ color: 'var(--color-danger)' }}
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        
        <div className="md:hidden divide-y"
             style={{ borderColor: 'var(--color-border)' }}>
          {users.map((u) => {
            const roleSlug  = u.user_roles?.[0]?.role?.slug ?? '';
            const roleLabel = ROLE_LABELS[roleSlug] ?? roleSlug;
            return (
              <div key={u.id} className="p-4"
                   style={{ background: 'var(--color-surface-0)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display"
                         style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}>
                      {getInitials(u.first_name, u.last_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium"
                         style={{ color: 'var(--color-text-900)' }}>
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs"
                         style={{ color: 'var(--color-text-400)' }}>{roleLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ color: 'var(--color-text-400)' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onResetPass(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ color: 'var(--color-text-400)' }}>
                      <KeyRound size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ color: 'var(--color-danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs mt-1"
                   style={{ color: 'var(--color-text-400)' }}>{u.email}</p>
              </div>
            );
          })}
        </div>
      </div>

   
      {deleteTarget && (
        <ConfirmDeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}