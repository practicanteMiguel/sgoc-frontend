'use client';

import { useState, useMemo } from 'react';
import {
  Search, Loader2, ChevronLeft, ChevronRight,
  Pencil, X as XIcon,
} from 'lucide-react';
import { useEmployees } from '@/src/hooks/reports/use-employees';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import { getInitials } from '@/src/lib/utils';
import { EmployeeForm } from './employee-form';
import type { Employee } from '@/src/types/reports.types';

const CONTRACT_FIELD_ID = 'dc9c6e07-e9f9-4184-ad1e-65386a7986be';
const PAGE_SIZE = 20;

const fmt = new Intl.NumberFormat('es-CO', {
  style:    'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const fmtDate = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const AUX_CONFIG = {
  aux_trans: { label: 'Transporte',    bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  aux_hab:   { label: 'Habitacion',    bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  aux_ali:   { label: 'Alimentacion',  bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
} as const;

type AuxKey = keyof typeof AUX_CONFIG;

const FIELD_STYLE_SM = {
  background:   'var(--color-surface-1)',
  border:       '1px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '7px 10px',
  fontSize:     '12px',
  outline:      'none',
};

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
    <div className="flex flex-wrap gap-1">
      {active.map((k) => {
        const cfg = AUX_CONFIG[k];
        return (
          <span
            key={k}
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────
interface ContractViewProps {
  canManage: boolean;
  isAdmin:   boolean;
}

export function ContractView({ canManage, isAdmin }: ContractViewProps) {
  const { data: contractData, isLoading: contractLoading } = useEmployees({
    field_id: CONTRACT_FIELD_ID,
    limit:    200,
  });
  const { data: allData, isLoading: allLoading } = useEmployees({ limit: 1000 });

  const contractEmployees = contractData?.data ?? [];
  const allEmployees      = (allData?.data ?? []).filter((e) => e.field_id !== CONTRACT_FIELD_ID);

  const [search,       setSearch]       = useState('');
  const [filterPos,    setFilterPos]    = useState('');
  const [filterSched,  setFilterSched]  = useState('');
  const [salaryMin,    setSalaryMin]    = useState('');
  const [salaryMax,    setSalaryMax]    = useState('');
  const [filterAux,    setFilterAux]    = useState<AuxKey[]>([]);
  const [page,         setPage]         = useState(1);
  const [detailEmp,    setDetailEmp]    = useState<Employee | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);

  const positions = useMemo(
    () => Array.from(new Set(allEmployees.map((e) => e.position))).sort(),
    [allEmployees],
  );
  const schedules = useMemo(
    () => Array.from(new Set(allEmployees.flatMap((e) => e.schedules))).sort(),
    [allEmployees],
  );

  const filtered = useMemo(() => {
    const q   = search.toLowerCase().trim();
    const min = salaryMin ? Number(salaryMin) : null;
    const max = salaryMax ? Number(salaryMax) : null;
    return allEmployees.filter((emp) => {
      if (q) {
        const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        if (!name.includes(q) && !emp.identification_number.toLowerCase().includes(q)) return false;
      }
      if (filterPos   && emp.position !== filterPos) return false;
      if (filterSched && !emp.schedules.includes(filterSched)) return false;
      if (min !== null && emp.salario_base < min) return false;
      if (max !== null && emp.salario_base > max) return false;
      if (filterAux.length > 0 && !filterAux.some((k) => emp[k])) return false;
      return true;
    });
  }, [allEmployees, search, filterPos, filterSched, salaryMin, salaryMax, filterAux]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = !!(search || filterPos || filterSched || salaryMin || salaryMax || filterAux.length);

  const clearFilters = () => {
    setSearch(''); setFilterPos(''); setFilterSched('');
    setSalaryMin(''); setSalaryMax(''); setFilterAux([]);
    setPage(1);
  };

  const toggleAux = (k: AuxKey) => {
    setFilterAux((prev) => prev.includes(k) ? prev.filter((v) => v !== k) : [...prev, k]);
    setPage(1);
  };

  const goPage = (n: number) => setPage(Math.max(1, Math.min(totalPages, n)));

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Contract employees ── */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h4 className="font-display font-semibold text-sm" style={{ color: 'var(--color-text-900)' }}>
              Personal del contrato
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {contractEmployees.length} persona{contractEmployees.length !== 1 ? 's' : ''} asignada{contractEmployees.length !== 1 ? 's' : ''} al contrato
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setAddOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              + Nuevo empleado
            </button>
          )}
        </div>

        {contractLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
          </div>
        ) : contractEmployees.length === 0 ? (
          <div
            className="flex items-center justify-center py-6 rounded-xl"
            style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              No hay personal asignado al contrato
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contractEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => setDetailEmp(emp)}
                className="p-4 rounded-xl text-left hover:opacity-80 transition-opacity"
                style={{
                  background: 'var(--color-surface-0)',
                  border:     '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                    style={{ background: 'var(--color-secondary)', color: '#fff' }}
                  >
                    {getInitials(emp.first_name, emp.last_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                      {emp.position}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-text-400)' }}>
                      CC {emp.identification_number}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── All other employees ── */}
      <div>
        <div className="mb-3">
          <h4 className="font-display font-semibold text-sm" style={{ color: 'var(--color-text-900)' }}>
            Todos los empleados
          </h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            {filtered.length} de {allEmployees.length} empleado{allEmployees.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2 flex-wrap">
            <div
              className="flex items-center gap-2 flex-1 rounded-lg px-3"
              style={{ ...FIELD_STYLE_SM, display: 'flex', padding: '7px 12px', minWidth: '180px' }}
            >
              <Search size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por nombre o cedula..."
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--color-text-900)', fontSize: '12px', width: '100%',
                }}
              />
            </div>
            {positions.length > 1 && (
              <select
                value={filterPos}
                onChange={(e) => { setFilterPos(e.target.value); setPage(1); }}
                style={{ ...FIELD_STYLE_SM, cursor: 'pointer' }}
              >
                <option value="">Todos los cargos</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {schedules.length > 1 && (
              <select
                value={filterSched}
                onChange={(e) => { setFilterSched(e.target.value); setPage(1); }}
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
                onChange={(e) => { setSalaryMin(e.target.value); setPage(1); }}
                placeholder="Salario min"
                style={{ ...FIELD_STYLE_SM, width: '120px' }}
              />
              <span style={{ color: 'var(--color-text-400)', fontSize: '12px' }}>-</span>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => { setSalaryMax(e.target.value); setPage(1); }}
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
                style={{ background: 'var(--color-surface-1)', color: 'var(--color-text-400)', border: '1px solid var(--color-border)' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {allLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
          </div>
        ) : paginated.length === 0 ? (
          <div
            className="flex items-center justify-center py-10 rounded-xl"
            style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              {allEmployees.length === 0
                ? 'No hay empleados registrados'
                : 'Ningun empleado coincide con los filtros'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl overflow-hidden mb-4"
                 style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Empleado', 'Cargo', 'Planta', 'Horario', 'Auxilios', 'Salario'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider"
                        style={{ color: 'var(--color-text-400)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: 'var(--color-surface-0)' }}>
                  {paginated.map((emp) => (
                    <tr
                      key={emp.id}
                      className="cursor-pointer hover:opacity-75 transition-opacity"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onClick={() => setDetailEmp(emp)}
                    >
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
                        <span className="text-sm" style={{ color: emp.field ? 'var(--color-text-600)' : 'var(--color-text-400)' }}>
                          {emp.field?.name ?? 'Sin planta'}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2 mb-4">
              {paginated.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setDetailEmp(emp)}
                  className="p-4 rounded-xl text-left w-full hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                      style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
                    >
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                        {emp.position} - CC {emp.identification_number}
                      </p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--color-text-400)' }}>
                      {emp.field?.name ?? 'Sin planta'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
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
                    <span className="text-xs font-mono shrink-0" style={{ color: 'var(--color-text-600)' }}>
                      {fmt.format(emp.salario_base)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  Pagina {page} de {totalPages} - {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goPage(page - 1)}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-30"
                    style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {(() => {
                    const windowSize = Math.min(5, totalPages);
                    let start = Math.max(1, page - Math.floor(windowSize / 2));
                    start = Math.min(start, totalPages - windowSize + 1);
                    return Array.from({ length: windowSize }, (_, i) => start + i).map((p) => (
                      <button
                        key={p}
                        onClick={() => goPage(p)}
                        className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: p === page ? 'var(--color-primary)' : 'var(--color-surface-1)',
                          border:     `1px solid ${p === page ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          color:      p === page ? '#fff' : 'var(--color-text-600)',
                        }}
                      >
                        {p}
                      </button>
                    ));
                  })()}

                  <button
                    onClick={() => goPage(page + 1)}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-30"
                    style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detailEmp && (
        <EmployeeDetailModal
          employee={detailEmp}
          canManage={canManage}
          isAdmin={isAdmin}
          onClose={() => setDetailEmp(null)}
          
        />
      )}

      {addOpen && (
        <EmployeeForm
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

// ── Employee detail modal ─────────────────────────────────────────
interface DetailModalProps {
  employee:  Employee;
  canManage: boolean;
  isAdmin:   boolean;
  onClose: () => void;

}

function EmployeeDetailModal({ employee, canManage, onClose }: DetailModalProps) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--color-surface-0)',
            border:     '1px solid var(--color-border)',
            boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
            maxHeight:  '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex items-center gap-4 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold font-display shrink-0"
              style={{ background: 'var(--color-secondary)', color: '#fff' }}
            >
              {getInitials(employee.first_name, employee.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                {employee.position}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: employee.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color:      employee.is_active ? '#4ade80' : '#f87171',
                  }}
                >
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </span>
                {employee.convenio && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secundary)' }}
                  >
                    {employee.convenio}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 shrink-0"
              style={{ color: 'var(--color-text-400)' }}
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6">

              {/* ── Datos personales ── */}
              <DetailSection title="Datos personales">
                <InfoItem label="Cédula"                   value={`CC ${employee.identification_number}`} mono />
                <InfoItem label="Lugar expedición cédula"  value={employee.lugar_expedicion} />
                <InfoItem label="Fecha expedición cédula"  value={fmtDate(employee.fecha_expedicion_cedula)} />
                <InfoItem label="Lugar nacimiento"         value={employee.lugar_nacimiento} />
                <InfoItem label="Fecha nacimiento"         value={fmtDate(employee.fecha_nacimiento)} />
                <InfoItem label="Estado civil"             value={employee.estado_civil} />
                <InfoItem label="Celular"                  value={employee.celular} mono />
                <InfoItem label="Correo"                   value={employee.correo_electronico} />
                <InfoItem label="Formación"                value={employee.formacion} />
                <InfoItem label="Dirección"                value={employee.direccion} full />
              </DetailSection>

              {/* ── Datos laborales ── */}
              <DetailSection title="Datos laborales">
                <InfoItem label="Cargo"              value={employee.position} />
                <InfoItem label="Salario base"       value={fmt.format(employee.salario_base)} mono />
                <InfoItem label="Código vacante"     value={employee.codigo_vacante} full />
                <InfoItem label="Convenio"           value={employee.convenio} />
                <InfoItem label="Inicio contrato"    value={fmtDate(employee.fecha_inicio_contrato)} />
                <InfoItem label="Retiro contrato"    value={fmtDate(employee.fecha_retiro_contrato)} />
                <InfoItem label="Prórroga"           value={employee.numero_prorroga} />
                <InfoItem label="Otrosí"             value={employee.numero_otro_si} />
                <InfoItem label="Vigencia"           value={fmtDate(employee.vigencia)} />
                <InfoItem label="Planta"             value={employee.field?.name} />
                <InfoItem label="Ubicación planta"   value={employee.field?.location} />

                <div className="col-span-2">
                  <p className="text-xs font-mono uppercase tracking-wider mb-2"
                     style={{ color: 'var(--color-text-400)' }}>Horarios</p>
                  {employee.schedules.length === 0 ? (
                    <span className="text-sm italic" style={{ color: 'var(--color-text-400)' }}>Sin horarios</span>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {employee.schedules.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2.5 py-1 rounded-full font-mono font-medium"
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
                  )}
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-mono uppercase tracking-wider mb-2"
                     style={{ color: 'var(--color-text-400)' }}>Auxilios</p>
                  <AuxTags emp={employee} />
                </div>
              </DetailSection>

              {/* ── Seguridad social ── */}
              <DetailSection title="Seguridad social">
                <InfoItem label="EPS"             value={employee.eps} />
                <InfoItem label="AFP / Pensión"   value={employee.afp} />
                <InfoItem label="Sindicato"       value={employee.afiliacion_sindicato} />
                <InfoItem label="Inclusión"       value={employee.inclusion} full />
              </DetailSection>

              {/* ── Datos bancarios ── */}
              <DetailSection title="Datos bancarios">
                <InfoItem label="Banco"          value={employee.banco} />
                <InfoItem label="Tipo de cuenta" value={employee.tipo_cuenta} />
                <InfoItem label="Número cuenta"  value={employee.numero_cuenta} mono />
              </DetailSection>

              {/* ── Certificado de residencia ── */}
              <DetailSection title="Certificado de residencia">
                <InfoItem label="Lugar expedición"  value={employee.lugar_exp_certificado_residencia} full />
                <InfoItem label="Fecha expedición"  value={fmtDate(employee.fecha_exp_certificado_residencia)} />
                <InfoItem label="Vencimiento"       value={fmtDate(employee.vencimiento_certificado_residencia)} />
              </DetailSection>

              {/* ── Sistema ── */}
              <DetailSection title="Sistema">
                <InfoItem label="Registro"             value={fmtDate(employee.created_at)} />
                <InfoItem label="Última actualización" value={fmtDate(employee.updated_at)} />
              </DetailSection>

            </div>
          </div>

          {/* Footer */}
          <div
            className="flex gap-3 px-6 py-4 shrink-0"
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
              Cerrar
            </button>
            {canManage && (
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                <Pencil size={14} /> Editar datos
              </button>
            )}
          </div>
        </div>
      </ModalPortal>

      {editing && (
        <EmployeeForm
          employee={employee}
          onClose={() => setEditing(false)}
          onSuccess={onClose}
        />
      )}
    </>
  );
}

// ── DetailSection ─────────────────────────────────────────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-xs font-mono uppercase tracking-wider pb-2 mb-3"
        style={{ color: 'var(--color-text-400)', borderBottom: '1px solid var(--color-border)' }}
      >
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {children}
      </div>
    </div>
  );
}

// ── InfoItem ──────────────────────────────────────────────────────
function InfoItem({
  label,
  value,
  mono,
  muted,
  full,
}: {
  label:  string;
  value?: string | null;
  mono?:  boolean;
  muted?: boolean;
  full?:  boolean;
}) {
  const empty = !value || value.trim() === '';
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs font-mono uppercase tracking-wider mb-1"
         style={{ color: 'var(--color-text-400)' }}>
        {label}
      </p>
      <p
        className={`text-sm ${mono ? 'font-mono' : ''} ${empty || muted ? 'italic' : ''}`}
        style={{ color: empty || muted ? 'var(--color-text-400)' : 'var(--color-text-900)' }}
      >
        {empty ? '—' : value}
      </p>
    </div>
  );
}