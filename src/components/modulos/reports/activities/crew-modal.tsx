'use client'

import { useState, useRef } from 'react'
import { X, Loader2, Users, CheckCircle2, Plus, Pencil, Check } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { getInitials } from '@/src/lib/utils'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import {
  useCrew,
  useCreateCrew,
  useRenameCrew,
  useAddCrewEmployee,
  useRemoveCrewEmployee,
} from '@/src/hooks/activities/use-crews'
import type { Crew } from '@/src/types/activities.types'
import type { Employee } from '@/src/types/reports.types'

interface Props {
  fieldId: string
  existingCrew?: Crew | null
  allCrews: Crew[]
  onClose: () => void
}

export function CrewModal({ fieldId, existingCrew, allCrews, onClose }: Props) {
  const [name,          setName]          = useState(existingCrew?.name ?? '')
  const [crewId,        setCrewId]        = useState<string | null>(existingCrew?.id ?? null)
  const [renaming,      setRenaming]      = useState(false)
  const [renameVal,     setRenameVal]     = useState(existingCrew?.name ?? '')
  const [isSoldadura,   setIsSoldadura]   = useState(existingCrew?.is_soldadura ?? false)
  const pendingRef = useRef(new Set<string>())

  const { data: fullCrew, isLoading: loadingCrew } = useCrew(crewId)
  const { data: empData,  isLoading: loadingEmps  } = useEmployees({ field_id: fieldId, limit: 200 })

  const createCrew = useCreateCrew()
  const renameCrew = useRenameCrew()
  const addEmp     = useAddCrewEmployee()
  const removeEmp  = useRemoveCrewEmployee()

  const crew      = fullCrew ?? existingCrew ?? null
  const employees = (empData?.data ?? []) as Employee[]

  // Build map: employeeId -> crew name (other than current)
  const empToOtherCrew = new Map<string, string>()
  for (const c of allCrews) {
    if (c.id === crewId) continue
    for (const e of c.employees) {
      empToOtherCrew.set(e.id, c.name)
    }
  }

  const crewEmpIds = new Set((crew?.employees ?? []).map((e) => e.id))

  function handleCreate() {
    if (!name.trim()) return
    createCrew.mutate({ name: name.trim(), is_soldadura: isSoldadura }, {
      onSuccess: (c) => {
        setCrewId(c.id)
        setRenameVal(c.name)
      },
    })
  }

  function handleRename() {
    if (!crewId || !renameVal.trim() || renameVal === crew?.name) {
      setRenaming(false)
      return
    }
    renameCrew.mutate({ id: crewId, name: renameVal.trim() }, {
      onSuccess: () => setRenaming(false),
    })
  }

  function toggleEmployee(emp: Employee) {
    if (!crewId || pendingRef.current.has(emp.id)) return
    pendingRef.current.add(emp.id)

    const finish = () => pendingRef.current.delete(emp.id)

    if (crewEmpIds.has(emp.id)) {
      removeEmp.mutate({ crewId, employeeId: emp.id }, { onSettled: finish })
    } else {
      addEmp.mutate({ crewId, employee_id: emp.id }, { onSettled: finish })
    }
  }

  const isNew   = !existingCrew && !crewId
  const created = !!crewId

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '88vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {created && !renaming ? (
              <>
                <h3
                  className="font-display font-semibold text-base truncate"
                  style={{ color: 'var(--color-secundary)' }}
                >
                  {crew?.name}
                </h3>
                <button
                  onClick={() => { setRenameVal(crew?.name ?? ''); setRenaming(true) }}
                  className="shrink-0 w-6 h-6 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-text-400)' }}
                >
                  <Pencil size={13} />
                </button>
              </>
            ) : created && renaming ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  autoFocus
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
                  className="flex-1 min-w-0 text-sm px-2 py-1 rounded-lg outline-none"
                  style={{
                    background: 'var(--color-surface-1)',
                    border:     '1.5px solid var(--color-secondary)',
                    color:      'var(--color-text-900)',
                  }}
                />
                <button
                  onClick={handleRename}
                  disabled={renameCrew.isPending}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
                  style={{ background: 'var(--color-primary)', color: '#fff', opacity: renameCrew.isPending ? 0.6 : 1 }}
                >
                  {renameCrew.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
              </div>
            ) : (
              <h3
                className="font-display font-semibold text-base"
                style={{ color: 'var(--color-secundary)' }}
              >
                Nueva cuadrilla
              </h3>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all ml-2"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Create phase */}
        {isNew && (
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Soldadura toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isSoldadura
                setIsSoldadura(next)
                if (next && !name.trim()) setName('Soldadura')
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all"
              style={{
                background: isSoldadura
                  ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                  : 'var(--color-surface-1)',
                border: `1.5px solid ${isSoldadura ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
            >
              <span
                style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSoldadura ? 'var(--color-primary)' : 'transparent',
                  border: `2px solid ${isSoldadura ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {isSoldadura && <Check size={11} color="#fff" strokeWidth={3} />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                  Es cuadrilla de soldadura
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  El informe mensual se generara en una seccion separada
                </p>
              </div>
            </button>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
                Nombre de la cuadrilla
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                placeholder={isSoldadura ? 'Soldadura' : 'Ej. Cuadrilla Norte'}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--color-surface-1)',
                  border:     '1.5px solid var(--color-border)',
                  color:      'var(--color-text-900)',
                }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createCrew.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'var(--color-primary)',
                color:      '#fff',
                opacity:    (!name.trim() || createCrew.isPending) ? 0.6 : 1,
              }}
            >
              {createCrew.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {createCrew.isPending ? 'Creando...' : 'Crear y asignar empleados'}
            </button>
          </div>
        )}

        {/* Employee assignment phase */}
        {created && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Stats bar */}
            <div
              className="px-6 py-3 flex items-center gap-3 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              <Users size={14} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                {loadingCrew ? '...' : `${crewEmpIds.size} empleado${crewEmpIds.size !== 1 ? 's' : ''} en esta cuadrilla`}
                {' - '}haz click para asignar o quitar
              </span>
            </div>

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
              {(loadingEmps || loadingCrew) ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--color-text-400)' }}>
                  No hay empleados en esta planta
                </p>
              ) : (
                employees.map((emp) => {
                  const inCrew    = crewEmpIds.has(emp.id)
                  const otherCrew = empToOtherCrew.get(emp.id)
                  const isPending = pendingRef.current.has(emp.id)

                  return (
                    <button
                      key={emp.id}
                      onClick={() => toggleEmployee(emp)}
                      disabled={isPending}
                      className="flex items-center gap-3 p-3 rounded-lg text-left transition-all w-full"
                      style={{
                        background: inCrew ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-surface-1)',
                        border:     `1.5px solid ${inCrew ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        opacity:    isPending ? 0.6 : 1,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                        style={{
                          background: inCrew ? 'var(--color-primary)' : 'var(--color-surface-2)',
                          color:      inCrew ? '#fff' : 'var(--color-text-400)',
                        }}
                      >
                        {getInitials(emp.first_name, emp.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                          {emp.position}
                          {otherCrew && !inCrew && (
                            <span style={{ color: 'var(--color-warning, #d97706)' }}>
                              {' '}&middot; ya en {otherCrew}
                            </span>
                          )}
                        </p>
                      </div>
                      {isPending ? (
                        <Loader2 size={15} className="animate-spin shrink-0" style={{ color: 'var(--color-text-400)' }} />
                      ) : inCrew ? (
                        <CheckCircle2 size={15} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 shrink-0"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}
