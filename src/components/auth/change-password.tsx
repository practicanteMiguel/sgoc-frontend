'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { useChangePassword } from '@/src/hooks/auth/use-auth';
import { useAuthStore } from '@/src/stores/auth.store';

const schema = z.object({
  new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
  current_password: z.string().optional(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

export function ChangePasswordForm({ isFirstLogin = true }: { isFirstLogin?: boolean }) {
  const { user }        = useAuthStore();
  const changePassword  = useChangePassword();
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  // Estado de confirmación — se muestra ANTES de ejecutar la API
  const [pendingData, setPendingData]       = useState<FormData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } }
    = useForm<FormData>({ resolver: zodResolver(schema) });

  // Al enviar el form: mostrar confirmación primero
  const onSubmit = (data: FormData) => {
    setPendingData(data);
    setShowConfirmModal(true);
  };

  // Al confirmar en el modal: ejecutar la API
  const onConfirm = () => {
    if (!pendingData) return;
    setShowConfirmModal(false);
    changePassword.mutate({
      new_password:     pendingData.new_password,
      current_password: pendingData.current_password,
    });
  };

  const fields = [
    ...(!isFirstLogin ? [{ name: 'current_password' as const, label: 'Contraseña actual' }] : []),
    { name: 'new_password'     as const, label: 'Nueva contraseña'     },
    { name: 'confirm_password'  as const, label: 'Confirmar contraseña'  },
  ];

  return (
    <>
      {/* ── Modal de confirmación ──────────────────────────────── */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 animate-fade-in"
            style={{
              background: 'var(--color-surface-0)',
              border:     '1px solid var(--color-border)',
              boxShadow:  '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-brand-muted)' }}
              >
                <ShieldCheck size={20} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold font-mono"
                   style={{ color: 'var(--color-text-900)' }}>
                  Confirmar cambio de contraseña
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  Revisá la información antes de continuar
                </p>
              </div>
            </div>

            {/* Aviso: esta vez entrará con la contraseña temporal */}
            <div
              className="rounded-lg p-3 mb-5 text-sm leading-relaxed"
              style={{
                background: 'var(--color-warning-bg)',
                border:     '1px solid rgba(180,83,9,0.2)',
                color:      'var(--color-warning)',
              }}
            >
              <strong className="font-semibold">Esta vez</strong> ingresarás al sistema con tu
              contraseña temporal. <strong className="font-semibold">La próxima vez
              que inicies sesión</strong> deberás usar la nueva contraseña que acabas de elegir.
            </div>

            <div
              className="flex items-center gap-2 p-3 rounded-lg mb-5"
              style={{
                background: 'var(--color-surface-1)',
                border:     '1px solid var(--color-border)',
              }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                Nueva contraseña establecida y lista para el próximo login
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
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
                onClick={onConfirm}
                disabled={changePassword.isPending}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: 'var(--color-brand)',
                  color:      '#fff',
                  opacity:    changePassword.isPending ? 0.75 : 1,
                }}
              >
                {changePassword.isPending
                  ? <Loader2 size={15} className="animate-spin" />
                  : <ArrowRight size={15} />}
                {changePassword.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulario ───────────────────────────────────────────── */}
      <div
        className="flex flex-1 items-center justify-center p-8"
        style={{ background: 'var(--color-surface-0)' }}
      >
        <div className="w-full max-w-sm animate-fade-in">

          <div
            className="flex items-start gap-4 mb-8 p-4 rounded-lg"
            style={{
              background: 'var(--color-brand-muted)',
              border:     '1px solid rgba(232,99,10,0.2)',
            }}
          >
            <ShieldCheck size={22} style={{ color: 'var(--color-brand)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p
                className="text-sm font-semibold mb-0.5 font-mono"
                style={{ color: 'var(--color-brand)' }}
              >
                {isFirstLogin ? 'Primer acceso al sistema' : 'Cambio de contraseña'}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-600)' }}>
                {isFirstLogin
                  ? `Hola ${user?.first_name ?? ''}, elegí tu contraseña para continuar.`
                  : 'Ingresá tu contraseña actual y la nueva.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {fields.map(({ name, label }) => (
              <div key={name} className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-mono uppercase tracking-wider"
                  style={{ color: 'var(--color-text-400)' }}
                >
                  {label}
                </label>
                <div className="relative">
                  <input
                    {...register(name)}
                    type={showFields[name] ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-lg text-sm outline-none transition-all"
                    style={{
                      background: 'var(--color-surface-1)',
                      border:     errors[name]
                        ? '1.5px solid var(--color-danger)'
                        : '1.5px solid var(--color-border)',
                      color:      'var(--color-text-900)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; }}
                    onBlur={(e)  => {
                      e.target.style.borderColor = errors[name]
                        ? 'var(--color-danger)'
                        : 'var(--color-border)';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFields((p) => ({ ...p, [name]: !p[name] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-text-400)' }}
                  >
                    {showFields[name] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors[name] && (
                  <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                    {errors[name]?.message}
                  </span>
                )}
              </div>
            ))}

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-semibold mt-2 flex items-center justify-center gap-2"
              style={{ background: 'var(--color-brand)', color: '#fff' }}
            >
              Continuar
            </button>
          </form>
        </div>
      </div>
    </>
  );
}