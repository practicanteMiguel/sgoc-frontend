'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useCreateField, useUpdateField } from '@/src/hooks/reports/use-fields';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import type { Field } from '@/src/types/reports.types';

const schema = z.object({
  name:     z.string().min(2, 'Mínimo 2 caracteres'),
  location: z.string().min(4, 'Mínimo 4 caracteres'),
});
type FormData = z.infer<typeof schema>;

const FIELD_STYLE = {
  background:   'var(--color-surface-1)',
  border:       '1.5px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  transition:   'all .15s',
};

const LABEL_CLASS = 'text-xs font-medium uppercase tracking-wider';

interface FieldFormProps {
  field?:  Field | null;
  onClose: () => void;
}

export function FieldForm({ field, onClose }: FieldFormProps) {
  const isEdit = !!field;
  const create = useCreateField();
  const update = useUpdateField();

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (field) {
      reset({ name: field.name, location: field.location });
    }
  }, [field, reset]);

  const onSubmit = (data: FormData) => {
    if (isEdit) {
      update.mutate({ id: field!.id, ...data }, { onSuccess: onClose });
    } else {
      create.mutate(data, { onSuccess: onClose });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base"
                style={{ color: 'var(--color-secundary)' }}>
              {isEdit ? 'Editar planta' : 'Nueva planta'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {isEdit ? 'Modificá los datos de la planta' : 'Completá los datos de la nueva planta'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                Nombre de la planta
              </label>
              <input
                {...register('name')}
                placeholder="Ej: DINA"
                style={{
                  ...FIELD_STYLE,
                  borderColor: errors.name ? 'var(--color-danger)' : 'var(--color-border)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                onBlur={(e)  => { e.target.style.borderColor = errors.name ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.name && (
                <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {errors.name.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                Ubicación
              </label>
              <input
                {...register('location')}
                placeholder="Ej: Km 17 vía Neiva - Bogotá, Huila"
                style={{
                  ...FIELD_STYLE,
                  borderColor: errors.location ? 'var(--color-danger)' : 'var(--color-border)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                onBlur={(e)  => { e.target.style.borderColor = errors.location ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.location && (
                <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {errors.location.message}
                </span>
              )}
            </div>
          </div>

          <div
            className="flex gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
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
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear planta'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
