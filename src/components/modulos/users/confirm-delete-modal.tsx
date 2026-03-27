'use client';

import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { ModalPortal } from '../../ui/modal-portal';
import { useDeleteUser } from '@/src/hooks/users/use-users';
import { getInitials } from '@/src/lib/utils';
import type { User } from '@/src/types/user.types';

interface ConfirmDeleteModalProps {
  user:    User;
  onClose: () => void;
}

export function ConfirmDeleteModal({ user, onClose }: ConfirmDeleteModalProps) {
  const deleteUser = useDeleteUser();

  const handleDelete = () => {
    deleteUser.mutate(user.id, { onSuccess: onClose });
  };

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 24px 64px rgba(4,24,24,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--color-danger-bg)' }}
          >
            <AlertTriangle size={22} style={{ color: 'var(--color-danger)' }} />
          </div>
          <h3
            className="font-display font-semibold text-base mb-1"
            style={{ color: 'var(--color-text-900)' }}
          >
            Eliminar usuario
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            ¿Estás seguro que querés eliminar a
          </p>

          
          <div
            className="flex items-center gap-3 mt-4 p-3 rounded-lg w-full"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
              style={{ background: 'var(--color-secondary)', color: '#fff' }}
            >
              {getInitials(user.first_name, user.last_name)}
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold truncate"
                 style={{ color: 'var(--color-text-900)' }}>
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs truncate"
                 style={{ color: 'var(--color-text-400)' }}>
                {user.email}
              </p>
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--color-text-400)' }}>
            Esta acción es un soft delete — el historial de auditoría se conserva.
          </p>
        </div>

    
        <div
          className="flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            disabled={deleteUser.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-70"
            style={{
              background: 'var(--color-surface-2)',
              border:     '1px solid var(--color-border)',
              color:      'var(--color-text-600)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteUser.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'var(--color-danger)',
              color:      '#fff',
              opacity:    deleteUser.isPending ? 0.75 : 1,
            }}
          >
            {deleteUser.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Trash2 size={14} />}
            {deleteUser.isPending ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}