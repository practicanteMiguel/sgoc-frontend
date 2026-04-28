export interface FieldSupervisor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
}

export interface Field {
  id: string;
  name: string;
  location: string;
  supervisor: FieldSupervisor | null;
  center_lat: number | null;
  center_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeField {
  id: string;
  name: string;
  location: string;
}

export interface Employee {
  id: string;
  identification_number: string;
  lugar_expedicion?: string | null;
  fecha_expedicion_cedula?: string | null;
  first_name: string;
  last_name: string;
  lugar_nacimiento?: string | null;
  fecha_nacimiento?: string | null;
  estado_civil?: string | null;
  celular?: string | null;
  direccion?: string | null;
  correo_electronico?: string | null;
  formacion?: string | null;
  position: string;
  codigo_vacante?: string | null;
  fecha_inicio_contrato?: string | null;
  fecha_retiro_contrato?: string | null;
  numero_prorroga?: string | null;
  numero_otro_si?: string | null;
  convenio?: string | null;
  vigencia?: string | null;
  aux_trans: boolean;
  aux_hab: boolean;
  aux_ali: boolean;
  salario_base: number;
  eps?: string | null;
  afp?: string | null;
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  afiliacion_sindicato?: string | null;
  inclusion?: string | null;
  lugar_exp_certificado_residencia?: string | null;
  fecha_exp_certificado_residencia?: string | null;
  vencimiento_certificado_residencia?: string | null;
  schedules: string[];
  field_id: string | null;
  field: EmployeeField | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
