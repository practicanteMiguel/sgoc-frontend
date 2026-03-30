'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useChangePassword } from '@/src/hooks/auth/use-auth';

const schema = z.object({
  current_password: z.string().min(1, 'Requerido'),
  new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

const FIELD_STYLE = {
  background:   'var(--color-surface-1)',
  border:       '1.5px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '10px 40px 10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  transition:   'all .15s',
};

export function PasswordTab() {
  const [show, setShow] = useState<Record<string, boolean>>({});
  const changePass = useChangePassword();

  const { register, handleSubmit, reset, formState: { errors } }
    = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    changePass.mutate(
      { current_password: data.current_password, new_password: data.new_password },
      { onSuccess: () => reset() },
    );
  };

  const fields = [
    { name: 'current_password' as const, label: 'Contraseña actual'    },
    { name: 'new_password'     as const, label: 'Nueva contraseña'    },
    { name: 'confirm_password'  as const, label: 'Confirmar contraseña' },
  ];

  return (
    <div className="max-w-md">
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-5 py-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
          <p className="text-xs font-mono uppercase tracking-widest"
             style={{ color: 'var(--color-text-400)' }}>
            Cambiar contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 flex flex-col gap-4">
          {fields.map(({ name, label }) => (
            <div key={name} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider"
                     style={{ color: 'var(--color-text-400)' }}>
                {label}
              </label>
              <div className="relative">
                <input
                  {...register(name)}
                  type={show[name] ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{
                    ...FIELD_STYLE,
                    borderColor: errors[name] ? 'var(--color-danger)' : 'var(--color-border)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = errors[name] ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button"
                        onClick={() => setShow((p) => ({ ...p, [name]: !p[name] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                        style={{ color: 'var(--color-text-400)' }}>
                  {show[name] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors[name] && (
                <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {errors[name]?.message}
                </span>
              )}
            </div>
          ))}

          <div
            className="flex items-start gap-2 p-3 rounded-lg"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <CheckCircle2 size={14} style={{ color: 'var(--color-text-400)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              Mínimo 8 caracteres. Usá letras, números y símbolos para mayor seguridad.
            </p>
          </div>

          <button
            type="submit"
            disabled={changePass.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold w-fit transition-all"
            style={{
              background: 'var(--color-primary)',
              color:      '#fff',
              opacity:    changePass.isPending ? 0.75 : 1,
            }}
          >
            {changePass.isPending && <Loader2 size={14} className="animate-spin" />}
            {changePass.isPending ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}