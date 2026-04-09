'use client';

import { useState } from 'react';
import {
  Plus, Pencil, Trash2, AlertTriangle, Loader2,
  MapPin, UserRound, UserX, UserCheck2, Users, FileText,
} from 'lucide-react';
import { useFields, useDeleteField, useRemoveSupervisor } from '@/src/hooks/reports/use-fields';
import { useEmployees } from '@/src/hooks/reports/use-employees';
import { useAuthStore } from '@/src/stores/auth.store';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import { getInitials } from '@/src/lib/utils';
import { FieldForm } from './field-form';
import { AssignSupervisorModal } from './assign-supervisor-modal';
import { EmployeeForm } from './employee-form';
import { EmployeesTable } from './employees-table';
import { ContractView } from './contract-view';
import type { Field, Employee } from '@/src/types/reports.types';

const CONTRACT_TAB      = '__contract__';
const CONTRACT_FIELD_ID = 'dc9c6e07-e9f9-4184-ad1e-65386a7986be';

export function FieldsManagement() {
  const { user } = useAuthStore();
  const isAdmin      = user?.roles?.includes('admin') ?? false;
  const canManage    = isAdmin || (user?.roles?.includes('coordinator') ?? false) || (user?.roles?.includes('module_manager') ?? false);

  const [activeFieldId, setActiveFieldId] = useState<string | null>(CONTRACT_TAB);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editField,     setEditField]     = useState<Field | null>(null);
  const [deleteField,   setDeleteField]   = useState<Field | null>(null);
  const [assignField,   setAssignField]   = useState<Field | null>(null);
  const [removeSupField, setRemoveSupField] = useState<Field | null>(null);

  const { data: fieldsData, isLoading: fieldsLoading } = useFields();
  const fields = fieldsData?.data ?? [];

  const isContractView = activeFieldId === CONTRACT_TAB;
  const currentField   = isContractView
    ? null
    : (fields.find((f) => f.id === activeFieldId) ?? fields[0] ?? null);

  if (fieldsLoading) {
    return (
      <div className="max-w-8xl p-10 mx-auto animate-fade-in">
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2
            className="font-display text-xl font-semibold"
            style={{ color: 'var(--color-secundary)' }}
          >
            Gestion de Plantas y Empleados
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            {fields.length} planta{fields.length !== 1 ? 's' : ''} registrada{fields.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditField(null); setShowFieldForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 animate-fade-in"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={15} /> Nueva planta
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {/* Contrato tab */}
        <button
          onClick={() => setActiveFieldId(CONTRACT_TAB)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
          style={
            isContractView
              ? {
                  background: 'var(--color-surface-0)',
                  color:      'var(--color-secundary)',
                  boxShadow:  '0 1px 4px rgba(7,44,44,0.12)',
                }
              : { color: 'var(--color-text-400)' }
          }
        >
          <FileText size={13} />
          Contrato
        </button>

        {/* Plant tabs */}
        {fields.filter((f) => f.id !== CONTRACT_FIELD_ID).map((f) => {
          const active = !isContractView && (activeFieldId ?? fields[0]?.id) === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFieldId(f.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={
                active
                  ? {
                      background: 'var(--color-surface-0)',
                      color:      'var(--color-secundary)',
                      boxShadow:  '0 1px 4px rgba(7,44,44,0.12)',
                    }
                  : { color: 'var(--color-text-400)' }
              }
            >
              <MapPin size={13} />
              {f.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isContractView ? (
        <ContractView canManage={canManage} isAdmin={isAdmin} />
      ) : fields.length === 0 ? (
        <div
          className="flex flex-col items-center py-20 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <MapPin size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
            No hay plantas registradas
          </p>
          {canManage && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
              Crea la primera planta con el boton de arriba
            </p>
          )}
        </div>
      ) : currentField ? (
        <FieldTabContent
          field={currentField}
          canManage={canManage}
          isAdmin={isAdmin}
          onEditField={(f) => { setEditField(f); setShowFieldForm(true); }}
          onDeleteField={setDeleteField}
          onAssignSupervisor={setAssignField}
          onRemoveSupervisor={setRemoveSupField}
        />
      ) : null}

      {showFieldForm && (
        <FieldForm
          field={editField}
          onClose={() => { setShowFieldForm(false); setEditField(null); }}
        />
      )}
      {deleteField && (
        <ConfirmDeleteFieldModal
          field={deleteField}
          onClose={() => setDeleteField(null)}
        />
      )}
      {assignField && (
        <AssignSupervisorModal
          field={assignField}
          onClose={() => setAssignField(null)}
        />
      )}
      {removeSupField && (
        <ConfirmRemoveSupervisorModal
          field={removeSupField}
          onClose={() => setRemoveSupField(null)}
        />
      )}
    </div>
  );
}

// ── Field tab content ─────────────────────────────────────────────
interface FieldTabContentProps {
  field:             Field;
  canManage:         boolean;
  isAdmin:           boolean;
  onEditField:       (f: Field) => void;
  onDeleteField:     (f: Field) => void;
  onAssignSupervisor:(f: Field) => void;
  onRemoveSupervisor:(f: Field) => void;
}

function FieldTabContent({
  field, canManage, isAdmin,
  onEditField, onDeleteField, onAssignSupervisor, onRemoveSupervisor,
}: FieldTabContentProps) {
  const [showEmpForm,  setShowEmpForm]  = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const { data: empData, isLoading: empLoading } = useEmployees({ field_id: field.id });
  const employees = empData?.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Plant info + supervisor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Plant info card */}
        <div
          className="p-5 rounded-xl flex flex-col gap-3"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1"
                 style={{ color: 'var(--color-text-400)' }}>
                Planta
              </p>
              <h3 className="font-display font-semibold text-lg"
                  style={{ color: 'var(--color-text-900)' }}>
                {field.name}
              </h3>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEditField(field)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-text-400)' }}
                  title="Editar planta"
                >
                  <Pencil size={14} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onDeleteField(field)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-danger)' }}
                    title="Eliminar planta"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
            <span className="text-sm" style={{ color: 'var(--color-text-600)' }}>
              {field.location}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1"
               style={{ borderTop: '1px solid var(--color-border)' }}>
            <Users size={14} style={{ color: 'var(--color-text-400)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              {employees.length} empleado{employees.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Supervisor card */}
        <div
          className="p-5 rounded-xl flex flex-col gap-3"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-mono uppercase tracking-wider"
               style={{ color: 'var(--color-text-400)' }}>
              Supervisor
            </p>
            {canManage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAssignSupervisor(field)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--color-secondary-muted)',
                    color:      'var(--color-secundary)',
                    border:     '1px solid rgba(7,44,44,0.12)',
                  }}
                  title="Asignar supervisor"
                >
                  <UserCheck2 size={12} />
                  {field.supervisor ? 'Cambiar' : 'Asignar'}
                </button>
                {field.supervisor && (
                  <button
                    onClick={() => onRemoveSupervisor(field)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{
                      background: 'var(--color-danger-bg)',
                      color:      'var(--color-danger)',
                      border:     '1px solid rgba(var(--color-danger-rgb),0.15)',
                    }}
                    title="Remover supervisor"
                  >
                    <UserX size={12} />
                    Remover
                  </button>
                )}
              </div>
            )}
          </div>

          {field.supervisor ? (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                style={{ background: 'var(--color-secondary)', color: '#fff' }}
              >
                {getInitials(field.supervisor.first_name, field.supervisor.last_name)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                  {field.supervisor.first_name} {field.supervisor.last_name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  {field.supervisor.position}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  {field.supervisor.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <UserRound size={18} style={{ color: 'var(--color-text-400)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
                Sin supervisor asignado
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Employees section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-display font-semibold text-sm"
                style={{ color: 'var(--color-text-900)' }}>
              Empleados
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {empData?.total ?? 0} registrados en esta planta
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => { setEditEmployee(null); setShowEmpForm(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Plus size={13} /> Nuevo empleado
            </button>
          )}
        </div>

        {empLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
          </div>
        ) : (
          <EmployeesTable
            employees={employees}
            canEdit={canManage}
            canDelete={isAdmin}
            onEdit={(emp) => { setEditEmployee(emp); setShowEmpForm(true); }}
          />
        )}
      </div>

      {showEmpForm && (
        <EmployeeForm
          employee={editEmployee}
          defaultFieldId={field.id}
          onClose={() => { setShowEmpForm(false); setEditEmployee(null); }}
        />
      )}
    </div>
  );
}

// ── Confirm delete field ──────────────────────────────────────────
function ConfirmDeleteFieldModal({ field, onClose }: { field: Field; onClose: () => void }) {
  const del = useDeleteField();

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
            Eliminar planta
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            Esta accion es un soft delete. El historial se conserva.
          </p>
          <div
            className="mt-4 p-3 rounded-lg w-full text-left"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {field.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {field.location}
            </p>
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
            onClick={() => del.mutate(field.id, { onSuccess: onClose })}
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

// ── Confirm remove supervisor ─────────────────────────────────────
function ConfirmRemoveSupervisorModal({ field, onClose }: { field: Field; onClose: () => void }) {
  const remove = useRemoveSupervisor();

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
            <UserX size={22} style={{ color: 'var(--color-text-400)' }} />
          </div>
          <h3 className="font-display font-semibold text-base mb-1"
              style={{ color: 'var(--color-text-900)' }}>
            Remover supervisor
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            Se removera al supervisor de la planta
            <span className="font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {' '}{field.name}
            </span>
            . El usuario no se elimina del sistema.
          </p>
          {field.supervisor && (
            <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-600)' }}>
              {field.supervisor.first_name} {field.supervisor.last_name}
            </p>
          )}
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
            onClick={() => remove.mutate(field.id, { onSuccess: onClose })}
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
