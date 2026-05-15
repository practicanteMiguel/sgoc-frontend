'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCreateInsumo, useUpdateInsumo } from '@/src/hooks/consumables/use-insumos'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { Insumo } from '@/src/types/consumables.types'

const createSchema = z.object({
  descripcion:             z.string().min(2, 'Requerido'),
  unidad:                  z.string().min(1, 'Requerido'),
  valor_unitario:          z.string().optional(),
  categoria:               z.enum(['PAPELERIA', 'CONSUMIBLE', 'EPP']),
  proveedor_ordinario:     z.string().optional(),
  proveedor_extraordinario: z.string().optional(),
})

const editSchema = z.object({
  valor_unitario:          z.string().optional(),
  proveedor_ordinario:     z.string().optional(),
  proveedor_extraordinario: z.string().optional(),
  activo:                  z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

const FIELD = {
  background:   'var(--color-surface-1)',
  border:       '1.5px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
}

const LABEL = 'text-xs font-medium uppercase tracking-wider'

interface Props {
  insumo:  Insumo | null
  onClose: () => void
}

export function InsumoModal({ insumo, onClose }: Props) {
  const isEdit = !!insumo
  const create = useCreateInsumo()
  const update = useUpdateInsumo()

  if (isEdit) {
    return <EditInsumoModal insumo={insumo} onClose={onClose} update={update} />
  }
  return <CreateInsumoModal onClose={onClose} create={create} />
}

function CreateInsumoModal({
  onClose,
  create,
}: {
  onClose: () => void
  create:  ReturnType<typeof useCreateInsumo>
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver:     zodResolver(createSchema),
    defaultValues: { categoria: 'PAPELERIA' },
  })

  const onSubmit = (data: CreateForm) => {
    create.mutate(
      {
        descripcion:              data.descripcion,
        unidad:                   data.unidad,
        categoria:                data.categoria,
        valor_unitario:           data.valor_unitario ? Number(data.valor_unitario) : undefined,
        proveedor_ordinario:      data.proveedor_ordinario     || undefined,
        proveedor_extraordinario: data.proveedor_extraordinario || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title="Nuevo insumo" onClose={onClose} />
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 flex flex-col gap-4">

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Descripcion</label>
                <input
                  {...register('descripcion')}
                  placeholder="Ej: RESMA DE PAPEL"
                  style={{ ...FIELD, borderColor: errors.descripcion ? 'var(--color-danger)' : 'var(--color-border)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.descripcion ? 'var(--color-danger)' : 'var(--color-border)' }}
                />
                {errors.descripcion && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.descripcion.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Unidad</label>
                <input
                  {...register('unidad')}
                  placeholder="Ej: RESMA, UND, KG"
                  style={{ ...FIELD, borderColor: errors.unidad ? 'var(--color-danger)' : 'var(--color-border)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.unidad ? 'var(--color-danger)' : 'var(--color-border)' }}
                />
                {errors.unidad && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.unidad.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Valor unitario</label>
                <input
                  {...register('valor_unitario')}
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Categoria</label>
                <select
                  {...register('categoria')}
                  style={{ ...FIELD, cursor: 'pointer' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Proveedor ordinario</label>
                <input
                  {...register('proveedor_ordinario')}
                  placeholder="Opcional"
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Proveedor extraordinario</label>
                <input
                  {...register('proveedor_extraordinario')}
                  placeholder="Opcional"
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>
            </div>
          </div>
          <ModalFooter onClose={onClose} isPending={create.isPending} submitLabel="Crear insumo" />
        </form>
      </div>
    </ModalPortal>
  )
}

function EditInsumoModal({
  insumo,
  onClose,
  update,
}: {
  insumo:  Insumo
  onClose: () => void
  update:  ReturnType<typeof useUpdateInsumo>
}) {
  const { register, handleSubmit, reset } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    reset({
      valor_unitario:           insumo.valor_unitario != null ? String(insumo.valor_unitario) : '',
      proveedor_ordinario:      insumo.proveedor_ordinario      ?? '',
      proveedor_extraordinario: insumo.proveedor_extraordinario ?? '',
      activo:                   insumo.activo,
    })
  }, [insumo, reset])

  const onSubmit = (data: EditForm) => {
    update.mutate(
      {
        id:                       insumo.id,
        valor_unitario:           data.valor_unitario ? Number(data.valor_unitario) : null,
        proveedor_ordinario:      data.proveedor_ordinario      || undefined,
        proveedor_extraordinario: data.proveedor_extraordinario || undefined,
        activo:                   data.activo,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title={`Editar ${insumo.codigo}`} subtitle={insumo.descripcion} onClose={onClose} />
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Valor unitario</label>
                <input
                  {...register('valor_unitario')}
                  type="number"
                  min="0"
                  placeholder="Dejar vacio para null"
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Proveedor ordinario</label>
                <input
                  {...register('proveedor_ordinario')}
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Proveedor extraordinario</label>
                <input
                  {...register('proveedor_extraordinario')}
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <input
                  {...register('activo')}
                  id="activo"
                  type="checkbox"
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="activo" className="text-sm cursor-pointer" style={{ color: 'var(--color-text-700)' }}>
                  Insumo activo (visible en nuevas requisiciones)
                </label>
              </div>
            </div>
          </div>
          <ModalFooter onClose={onClose} isPending={update.isPending} submitLabel="Guardar cambios" />
        </form>
      </div>
    </ModalPortal>
  )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div>
        <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{subtitle}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
        style={{ color: 'var(--color-text-400)' }}
      >
        <X size={16} />
      </button>
    </div>
  )
}

function ModalFooter({ onClose, isPending, submitLabel }: { onClose: () => void; isPending: boolean; submitLabel: string }) {
  return (
    <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-70"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
        style={{ background: 'var(--color-primary)', color: '#fff', opacity: isPending ? 0.75 : 1 }}
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? 'Guardando...' : submitLabel}
      </button>
    </div>
  )
}
