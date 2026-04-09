'use client';

import { useState, useMemo } from 'react';
import {
  Pencil, Trash2, AlertTriangle, Loader2,
  ArrowRightLeft, X as XIcon, Search,
} from 'lucide-react';
import { useDeleteEmployee, useRemoveEmployeeField, useChangeEmployeeField } from '@/src/hooks/reports/use-employees';
import { useFields } from '@/src/hooks/reports/use-fields';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import { getInitials } from '@/src/lib/utils';
import type { Employee, Field } from '@/src/types/reports.types';

const fmt = new Intl.NumberFormat('es-CO', {
  style:    'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const AUX_CONFIG = {
  aux_trans: { label: 'Transporte',    bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  aux_hab:   { label: 'Habitacion',    bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  aux_ali:   { label: 'Alimentacion',  bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
} as const;

type AuxKey = keyof typeof AUX_CONFIG;

function AuxTags({ emp }: { emp: Employee }) {
  const active = (Object.keys(AUX_CONFIG) as AuxKey[]).filter((k) => emp[k]);
  if (active.length === 0) {
    return (
      <span className="text-xs italic" style={{ color: 'var(--color-text-400)' }}>
        Sin auxilios
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {active.map((k) => {
        const cfg = AUX_CONFIG[k];
        return (
          <span
            key={k}
            className="text-xs px-2 py-0.5 rounded-full font-medium w-fit"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

const FIELD_STYLE_SM = {
  background:   'var(--color-surface-1)',
  border:       '1px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '7px 10px',
  fontSize:     '12px',
  outline:      'none',
};

interface EmployeesTableProps {
  employees: Employee[];
  canEdit:   boolean;
  canDelete: boolean;
  onEdit:    (e: Employee) => void;
}

export function EmployeesTable({ employees, canEdit, canDelete, onEdit }: EmployeesTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [moveTarget,   setMoveTarget]   = useState<Employee | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null);

  const [search,        setSearch]        = useState('');
  const [filterPos,     setFilterPos]     = useState('');
  const [filterSched,   setFilterSched]   = useState('');
  const [salaryMin,     setSalaryMin]     = useState('');
  const [salaryMax,     setSalaryMax]     = useState('');
  const [filterAux,     setFilterAux]     = useState<AuxKey[]>([]);

  const positions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.position))).sort(),
    [employees],
  );

  const schedules = useMemo(
    () => Array.from(new Set(employees.flatMap((e) => e.schedules))).sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q    = search.toLowerCase().trim();
    const min  = salaryMin ? Number(salaryMin) : null;
    const max  = salaryMax ? Number(salaryMax) : null;

    return employees.filter((emp) => {
      if (q) {
        const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const cc   = emp.identification_number.toLowerCase();
        if (!name.includes(q) && !cc.includes(q)) return false;
      }
      if (filterPos   && emp.position !== filterPos) return false;
      if (filterSched && !emp.schedules.includes(filterSched)) return false;
      if (min !== null && emp.salario_base < min) return false;
      if (max !== null && emp.salario_base > max) return false;
      if (filterAux.length > 0 && !filterAux.some((k) => emp[k])) return false;
      return true;
    });
  }, [employees, search, filterPos, filterSched, salaryMin, salaryMax, filterAux]);

  const hasFilters = search || filterPos || filterSched || salaryMin || salaryMax || filterAux.length > 0;

  const clearFilters = () => {
    setSearch(''); setFilterPos(''); setFilterSched('');
    setSalaryMin(''); setSalaryMax(''); setFilterAux([]);
  };

  const toggleAux = (k: AuxKey) =>
    setFilterAux((prev) => prev.includes(k) ? prev.filter((v) => v !== k) : [...prev, k]);

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-45 rounded-lg px-3"
               style={{ ...FIELD_STYLE_SM, padding: '7px 12px', display: 'flex' }}>
            <Search size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o cedula..."
              style={{
                background: 'transparent',
                border:     'none',
                outline:    'none',
                color:      'var(--color-text-900)',
                fontSize:   '12px',
                width:      '100%',
              }}
            />
          </div>
          {positions.length > 1 && (
            <select
              value={filterPos}
              onChange={(e) => setFilterPos(e.target.value)}
              style={{ ...FIELD_STYLE_SM, cursor: 'pointer' }}
            >
              <option value="">Todos los cargos</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {schedules.length > 1 && (
            <select
              value={filterSched}
              onChange={(e) => setFilterSched(e.target.value)}
              style={{ ...FIELD_STYLE_SM, cursor: 'pointer' }}
            >
              <option value="">Todos los horarios</option>
              {schedules.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder="Salario min"
              style={{ ...FIELD_STYLE_SM, width: '120px' }}
            />
            <span style={{ color: 'var(--color-text-400)', fontSize: '12px' }}>-</span>
            <input
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              placeholder="Salario max"
              style={{ ...FIELD_STYLE_SM, width: '120px' }}
            />
          </div>

          <div className="flex gap-1.5">
            {(Object.keys(AUX_CONFIG) as AuxKey[]).map((k) => {
              const cfg    = AUX_CONFIG[k];
              const active = filterAux.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleAux(k)}
                  className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: active ? cfg.bg : 'var(--color-surface-1)',
                    color:      active ? cfg.color : 'var(--color-text-400)',
                    border:     `1px solid ${active ? cfg.color + '50' : 'var(--color-border)'}`,
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs px-2.5 py-1 rounded-full hover:opacity-70 transition-opacity"
              style={{
                background: 'var(--color-surface-1)',
                color:      'var(--color-text-400)',
                border:     '1px solid var(--color-border)',
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center py-10 rounded-xl"
          style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            {employees.length === 0
              ? 'No hay empleados en esta planta'
              : 'Ningún empleado coincide con los filtros'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-xl overflow-hidden"
               style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Empleado', 'Cargo', 'Horario', 'Auxilios', 'Salario', ''].map((h) => (
                    <th key={h}
                        className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider"
                        style={{ color: 'var(--color-text-400)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: 'var(--color-surface-0)' }}>
                {filtered.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                          style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
                        >
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs font-mono" style={{ color: 'var(--color-text-400)' }}>
                            CC {emp.identification_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--color-text-600)' }}>
                        {emp.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {emp.schedules.map((s) => (
                          <span
                            key={s}
                            className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
                            style={{
                              background: 'var(--color-secondary-muted)',
                              color:      'var(--color-secundary)',
                              border:     '1px solid rgba(7,44,44,0.12)',
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AuxTags emp={emp} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono" style={{ color: 'var(--color-text-600)' }}>
                        {fmt.format(emp.salario_base)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => onEdit(emp)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--color-text-400)' }}
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            {emp.field_id && (
                              <button
                                onClick={() => setMoveTarget(emp)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--color-text-400)' }}
                                title="Mover a otra planta"
                              >
                                <ArrowRightLeft size={13} />
                              </button>
                            )}
                            {emp.field_id && (
                              <button
                                onClick={() => setRemoveTarget(emp)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--color-text-400)' }}
                                title="Remover de planta"
                              >
                                <XIcon size={13} />
                              </button>
                            )}
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--color-danger)' }}
                            title="Eliminar empleado"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex flex-col gap-2">
            {filtered.map((emp) => (
              <div
                key={emp.id}
                className="p-4 rounded-xl"
                style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                      style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
                    >
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                        {emp.position} - CC {emp.identification_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onEdit(emp)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ color: 'var(--color-text-400)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        {emp.field_id && (
                          <button
                            onClick={() => setMoveTarget(emp)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ color: 'var(--color-text-400)' }}
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        )}
                        {emp.field_id && (
                          <button
                            onClick={() => setRemoveTarget(emp)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ color: 'var(--color-text-400)' }}
                          >
                            <XIcon size={14} />
                          </button>
                        )}
                      </>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {emp.schedules.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
                          style={{
                            background: 'var(--color-secondary-muted)',
                            color:      'var(--color-secundary)',
                            border:     '1px solid rgba(7,44,44,0.12)',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <AuxTags emp={emp} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-600)' }}>
                    {fmt.format(emp.salario_base)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {deleteTarget && (
        <ConfirmDeleteEmployeeModal
          employee={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {moveTarget && (
        <MoveEmployeeModal
          employee={moveTarget}
          onClose={() => setMoveTarget(null)}
        />
      )}
      {removeTarget && (
        <ConfirmRemoveFromFieldModal
          employee={removeTarget}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </>
  );
}

// ── Confirm delete employee ───────────────────────────────────────
function ConfirmDeleteEmployeeModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const del = useDeleteEmployee();

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
          <h3 className="font-display font-semibold text-base mb-1"
              style={{ color: 'var(--color-text-900)' }}>
            Eliminar empleado
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            Esta accion es un soft delete. El historial se conserva.
          </p>
          <div
            className="flex items-center gap-3 mt-4 p-3 rounded-lg w-full text-left"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
              style={{ background: 'var(--color-secondary)', color: '#fff' }}
            >
              {getInitials(employee.first_name, employee.last_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                CC {employee.identification_number} - {employee.position}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4"
             style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={onClose}
            disabled={del.isPending}
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
            onClick={() => del.mutate(employee.id, { onSuccess: onClose })}
            disabled={del.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-danger)',
              color:      '#fff',
              opacity:    del.isPending ? 0.75 : 1,
            }}
          >
            {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {del.isPending ? 'Eliminando...' : 'Si, eliminar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Confirm remove employee from field ────────────────────────────
function ConfirmRemoveFromFieldModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const remove = useRemoveEmployeeField();

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
            style={{ background: 'var(--color-surface-2)' }}
          >
            <XIcon size={22} style={{ color: 'var(--color-text-400)' }} />
          </div>
          <h3 className="font-display font-semibold text-base mb-1"
              style={{ color: 'var(--color-text-900)' }}>
            Remover de planta
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            El empleado quedara sin planta asignada. No se elimina del sistema.
          </p>
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
            {employee.first_name} {employee.last_name}
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4"
             style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
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
            onClick={() => remove.mutate(employee.id, { onSuccess: onClose })}
            disabled={remove.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-primary)',
              color:      '#fff',
              opacity:    remove.isPending ? 0.75 : 1,
            }}
          >
            {remove.isPending && <Loader2 size={14} className="animate-spin" />}
            {remove.isPending ? 'Removiendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Move employee to another field ────────────────────────────────
function MoveEmployeeModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const change = useChangeEmployeeField();
  const { data: fieldsData } = useFields();

  const availableFields = (fieldsData?.data ?? []).filter((f) => f.id !== employee.field_id);

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '80vh',
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
              Mover a otra planta
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {employee.first_name} {employee.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ color: 'var(--color-text-400)' }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {availableFields.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-400)' }}>
              No hay otras plantas disponibles
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableFields.map((f) => {
                const active = selectedFieldId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFieldId(f.id)}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      background: active ? 'var(--color-secondary-muted)' : 'var(--color-surface-1)',
                      border:     `1.5px solid ${active ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                      {f.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                      {f.location}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
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
            onClick={() => change.mutate({ employeeId: employee.id, field_id: selectedFieldId }, { onSuccess: onClose })}
            disabled={!selectedFieldId || change.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-primary)',
              color:      '#fff',
              opacity:    (!selectedFieldId || change.isPending) ? 0.6 : 1,
            }}
          >
            {change.isPending && <Loader2 size={14} className="animate-spin" />}
            {change.isPending ? 'Moviendo...' : 'Mover'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
