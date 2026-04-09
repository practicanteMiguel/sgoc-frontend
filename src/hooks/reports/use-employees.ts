import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';
import type { Employee } from '@/src/types/reports.types';
import type { PaginatedResponse } from '@/src/types/user.types';

export function useEmployees(params?: { page?: number; limit?: number; field_id?: string }) {
  const { page = 1, limit = 100, field_id } = params ?? {};
  const qs = field_id
    ? `/employees?field_id=${field_id}&page=${page}&limit=${limit}`
    : `/employees?page=${page}&limit=${limit}`;

  return useQuery({
    queryKey: ['employees', { page, limit, field_id }],
    queryFn:  () =>
      api.get<PaginatedResponse<Employee>>(qs).then((r) => r.data),
  });
}

export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn:  () => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export type EmployeeCreatePayload = {
  identification_number: string;
  first_name: string;
  last_name: string;
  position: string;
  salario_base: number;
  schedules: string[];
  aux_trans: boolean;
  aux_hab: boolean;
  aux_ali: boolean;
  field_id?: string;
  // optional personal
  lugar_expedicion?: string;
  fecha_expedicion_cedula?: string;
  lugar_nacimiento?: string;
  fecha_nacimiento?: string;
  estado_civil?: string;
  celular?: string;
  direccion?: string;
  correo_electronico?: string;
  formacion?: string;
  // optional contract
  codigo_vacante?: string;
  fecha_inicio_contrato?: string;
  fecha_retiro_contrato?: string;
  numero_prorroga?: string;
  numero_otro_si?: string;
  convenio?: string;
  vigencia?: string;
  // optional social security
  eps?: string;
  afp?: string;
  // optional bank
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  // optional other
  afiliacion_sindicato?: string;
  inclusion?: string;
  lugar_exp_certificado_residencia?: string;
  fecha_exp_certificado_residencia?: string;
  vencimiento_certificado_residencia?: string;
};

export type EmployeeUpdatePayload = Partial<Omit<EmployeeCreatePayload, 'identification_number' | 'field_id'>>;

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeCreatePayload) =>
      api.post<Employee>('/employees', data).then((r) => r.data),
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Empleado ${emp.first_name} ${emp.last_name} creado`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear empleado'));
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & EmployeeUpdatePayload) =>
      api.patch<Employee>(`/employees/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado actualizado correctamente');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar'));
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado eliminado');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'));
    },
  });
}

export function useAssignEmployeeField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, field_id }: { employeeId: string; field_id: string }) =>
      api.post(`/employees/${employeeId}/field`, { field_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado asignado a la planta');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al asignar a planta'));
    },
  });
}

export function useChangeEmployeeField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, field_id }: { employeeId: string; field_id: string }) =>
      api.patch(`/employees/${employeeId}/field`, { field_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado movido a la nueva planta');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al cambiar planta'));
    },
  });
}

export function useRemoveEmployeeField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) =>
      api.delete(`/employees/${employeeId}/field`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado removido de la planta');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al remover de planta'));
    },
  });
}
