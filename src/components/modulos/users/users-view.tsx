'use client';

import { useState } from 'react';
import { UserPlus, Search, Loader2, Users, Shield } from 'lucide-react';
import { useUsers } from '@/src/hooks/users/use-users';
import { UsersTable } from './users-table';
import { UserForm } from './user-form';
import { ResetPasswordModal } from './reset-password-modal';
import { RolesView } from './roles/roles-view';
import { UserModuleAccessMatrix } from './roles/user-module-access-matrix';
import type { User } from '@/src/types/user.types';

type Tab = 'users' | 'roles';

export function UsersView() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [resetUser, setResetUser]   = useState<User | null>(null);
  const [accessUser, setAccessUser] = useState<User | null>(null);

  const { data, isLoading } = useUsers();

  const filteredUsers = (data?.data ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)  ||
      u.email.toLowerCase().includes(q)      ||
      u.position.toLowerCase().includes(q)
    );
  });

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'users', label: 'Usuarios', icon: Users  },
    { id: 'roles', label: 'Roles y Permisos', icon: Shield },
  ];

  return (
    <div className="max-w-8xl p-10  mx-auto animate-fade-in">

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold"
              style={{ color: 'var(--color-secundary)' }}>
            Usuarios y Roles
          </h2>
          <p className="text-sm mt-0.5"
             style={{ color: 'var(--color-text-400)' }}>
            Gestioná el acceso y los permisos del sistema
          </p>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => { setEditUser(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 animate-fade-in"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <UserPlus size={16} /> Nuevo usuario
          </button>
        )}
      </div>

      
      <div
        className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              activeTab === id
                ? {
                    background: 'var(--color-surface-0)',
                    color:      'var(--color-secundary)',
                    boxShadow:  '0 1px 4px rgba(7,44,44,0.12)',
                  }
                : { color: 'var(--color-text-400)' }
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <p className="text-xs mb-3"
             style={{ color: 'var(--color-text-400)' }}>
            {data?.total ?? 0} usuarios registrados
          </p>

          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-400)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o cargo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
              
                border:     '1.5px solid var(--color-border)',
                color:      'var(--color-text-900)',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)'; }}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin"
                style={{ color: 'var(--color-secondary)' }} />
            </div>
          ) : (
            <UsersTable
              users={filteredUsers}
              onEdit={(u) => { setEditUser(u); setShowForm(true); }}
              onResetPass={(u) => setResetUser(u)}
              onManageAccess={(u) => setAccessUser(u)}
            />
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="animate-fade-in">
          <RolesView />
        </div>
      )}

      {showForm && (
        <UserForm
          user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null); }}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}
      {accessUser && (
        <UserModuleAccessMatrix
          user={accessUser}
          onClose={() => setAccessUser(null)}
        />
      )}
    </div>
  );
}