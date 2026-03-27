'use client';

import { useState } from 'react';
import { X, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useResetPassword } from '@/src/hooks/users/use-users';
import { getInitials } from '@/src/lib/utils';
import type { User } from '@/src/types/user.types';
import { ModalPortal } from '../../ui/modal-portal';

interface ResetPasswordModalProps {
  user:    User;
  onClose: () => void;
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const resetPassword           = useResetPassword();

  const handleSubmit = () => {
    if (password.length < 8) return;
    resetPassword.mutate(
      { id: user.id, new_password: password },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl "
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
        }}
      >
        
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
            >
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold font-display"
                 style={{ color: 'var(--color-secundary)' }}>
                Resetear contraseña
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                {user.first_name} {user.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={15} />
          </button>
        </div>

      
        <div className="px-5 py-5">
          <div
            className="flex items-center gap-3 p-3 rounded-lg mb-5"
            style={{
              background: 'var(--color-warning-bg)',
              border:     '1px solid rgba(217,119,6,0.2)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
              style={{ background: 'var(--color-secondary)', color: '#fff' }}
            >
              {getInitials(user.first_name, user.last_name)}
            </div>
            <div>
              <p className="text-xs font-medium"
                 style={{ color: 'var(--color-warning)' }}>
                El usuario recibirá un email con la nueva contraseña
                y deberá cambiarla al ingresar.
              </p>
            </div>
          </div>

          <label
            className="text-xs font-medium uppercase tracking-wider block mb-1.5"
            style={{ color: 'var(--color-text-400)' }}
          >
            Nueva contraseña temporal
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full pr-10 rounded-lg text-sm outline-none transition-all"
              style={{
                padding:    '10px 14px',
                background: 'var(--color-surface-1)',
                border:     password.length > 0 && password.length < 8
                  ? '1.5px solid var(--color-danger)'
                  : '1.5px solid var(--color-border)',
                color: 'var(--color-text-900)',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
              onBlur={(e)  => { e.target.style.borderColor = password.length > 0 && password.length < 8 ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
              style={{ color: 'var(--color-text-400)' }}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
              Mínimo 8 caracteres
            </p>
          )}
        </div>

        
        <div
          className="flex gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70"
            style={{
              background: 'var(--color-surface-2)',
              border:     '1px solid var(--color-border)',
              color:      'var(--color-text-600)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={password.length < 8 || resetPassword.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-warning)',
              color:      '#fff',
              opacity:    password.length < 8 || resetPassword.isPending ? 0.5 : 1,
            }}
          >
            {resetPassword.isPending && <Loader2 size={14} className="animate-spin" />}
            {resetPassword.isPending ? 'Enviando...' : 'Resetear contraseña'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}