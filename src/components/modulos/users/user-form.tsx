'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useCreateUser, useUpdateUser } from '@/src/hooks/users/use-users';
import { useRoles } from '@/src/hooks/users/use-roles';
import { useFields, useAssignSupervisor } from '@/src/hooks/reports/use-fields';
import { MODULE_CONFIG } from '@/src/config/modules.config';
import type { User } from '@/src/types/user.types';
import { ModalPortal } from '../../ui/modal-portal';

const schema = z.object({
  first_name:    z.string().min(2, 'Mínimo 2 caracteres'),
  last_name:     z.string().min(2, 'Mínimo 2 caracteres'),
  email:         z.string().email('Email inválido'),
  position:      z.string().min(2, 'Requerido'),
  phone:         z.string().optional(),
  role_slug:     z.string().min(1, 'Seleccioná un rol'),
  field_id:      z.string().optional(),
  module:        z.string().optional(),
  temp_password: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface UserFormProps {
  user?:    User | null;
  onClose:  () => void;
}

const FIELD_STYLE = {
  background: 'var(--color-surface-1)',
  border:     '1.5px solid var(--color-border)',
  color:      'var(--color-text-900)',
  borderRadius: '8px',
  padding:    '10px 14px',
  fontSize:   '13px',
  width:      '100%',
  outline:    'none',
  transition: 'all .15s',
};

const LABEL_CLASS = "text-xs font-medium uppercase tracking-wider";

export function UserForm({ user, onClose }: UserFormProps) {
  const isEdit          = !!user;
  const create          = useCreateUser();
  const update          = useUpdateUser();
  const assignSupervisor = useAssignSupervisor();
  const { data: roles } = useRoles();
  const { data: fieldsPage } = useFields(1, 200);
  const fields = fieldsPage?.data ?? [];

  const {
    register, handleSubmit, watch, reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const roleSlug      = watch('role_slug');
  const selectedField = watch('field_id');

  const selectedFieldObj = fields.find(f => f.id === selectedField);
  const fieldHasSupervisor = !isEdit && !!selectedFieldObj?.supervisor;

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        position:   user.position,
        phone:      user.phone ?? '',
        role_slug:  user.user_roles?.[0]?.role?.slug ?? '',
        field_id:   user.field ?? '',
        module:     user.module ?? '',
      });
    }
  }, [user, reset]);

  const onSubmit = (data: FormData) => {
    if (isEdit) {
      update.mutate({ id: user!.id, ...data }, { onSuccess: onClose });
      return;
    }

    create.mutate(data, {
      onSuccess: (newUser) => {
        if (data.role_slug === 'supervisor' && data.field_id) {
          assignSupervisor.mutate(
            { fieldId: data.field_id, user_id: newUser.id },
            { onSuccess: onClose, onError: onClose },
          );
        } else {
          onClose();
        }
      },
    });
  };

  const isPending = create.isPending || update.isPending || assignSupervisor.isPending;
  const modules   = Object.values(MODULE_CONFIG);

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base"
                style={{ color: 'var(--color-secundary)' }}>
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {isEdit
                ? 'Modificá los datos del usuario'
                : 'Se enviará un email con la contraseña temporal'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 flex flex-col gap-4">

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'first_name' as const, label: 'Nombre'   },
                { name: 'last_name'  as const, label: 'Apellido' },
              ].map(({ name, label }) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                    {label}
                  </label>
                  <input
                    {...register(name)}
                    style={{
                      ...FIELD_STYLE,
                      borderColor: errors[name] ? 'var(--color-danger)' : 'var(--color-border)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = errors[name] ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {errors[name] && (
                    <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                      {errors[name]?.message}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                Correo electrónico
              </label>
              <input
                {...register('email')}
                type="email"
                disabled={isEdit}
                style={{
                  ...FIELD_STYLE,
                  borderColor: errors.email ? 'var(--color-danger)' : 'var(--color-border)',
                  opacity: isEdit ? 0.6 : 1,
                }}
                onFocus={(e) => { if (!isEdit) { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}}
                onBlur={(e)  => { e.target.style.borderColor = errors.email ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.email && (
                <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'position' as const, label: 'Cargo',     placeholder: 'Ej: Supervisor de Planta' },
                { name: 'phone'    as const, label: 'Teléfono', placeholder: '+57 300 000 0000'       },
              ].map(({ name, label, placeholder }) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                    {label}
                  </label>
                  <input
                    {...register(name)}
                    placeholder={placeholder}
                    style={{
                      ...FIELD_STYLE,
                      borderColor: errors[name] ? 'var(--color-danger)' : 'var(--color-border)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = errors[name] ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {errors[name] && (
                    <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                      {errors[name]?.message}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                Rol
              </label>
              <select
                {...register('role_slug')}
                style={{
                  ...FIELD_STYLE,
                  borderColor: errors.role_slug ? 'var(--color-danger)' : 'var(--color-border)',
                  cursor: 'pointer',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; }}
                onBlur={(e)  => { e.target.style.borderColor = errors.role_slug ? 'var(--color-danger)' : 'var(--color-border)'; }}
              >
                <option value="">Seleccioná un rol</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.slug}>{r.name}</option>
                ))}
              </select>
              {errors.role_slug && (
                <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {errors.role_slug.message}
                </span>
              )}
            </div>

            {roleSlug === 'supervisor' && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                  Planta operativa
                </label>
                <select
                  {...register('field_id')}
                  style={{
                    ...FIELD_STYLE,
                    cursor: 'pointer',
                    borderColor: fieldHasSupervisor ? '#d97706' : 'var(--color-border)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = fieldHasSupervisor ? '#d97706' : 'var(--color-border)'; }}
                >
                  <option value="">Seleccioná una planta</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.location}
                      {f.supervisor ? ' (con supervisor)' : ''}
                    </option>
                  ))}
                </select>

                {fieldHasSupervisor && selectedFieldObj?.supervisor && (
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
                    style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: '#92400e' }}
                  >
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                    <span>
                      Esta planta ya tiene asignado al supervisor{' '}
                      <strong>{selectedFieldObj.supervisor.first_name} {selectedFieldObj.supervisor.last_name}</strong>.
                      Si continúas, se reemplazará la asignación actual.
                    </span>
                  </div>
                )}
              </div>
            )}

            {roleSlug === 'module_manager' && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                  Módulo a gestionar
                </label>
                <select
                  {...register('module')}
                  style={{ ...FIELD_STYLE, cursor: 'pointer' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)'; }}
                >
                  <option value="">Seleccioná el módulo</option>
                  {modules.map((m) => (
                    <option key={m.slug} value={m.slug}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                  Contraseña temporal (opcional)
                </label>
                <input
                  {...register('temp_password')}
                  type="text"
                  placeholder="Se generará automáticamente si se deja vacío"
                  style={FIELD_STYLE}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            )}
          </div>

          <div
            className="flex gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
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
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'var(--color-primary)',
                color:      '#fff',
                opacity:    isPending ? 0.75 : 1,
              }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
