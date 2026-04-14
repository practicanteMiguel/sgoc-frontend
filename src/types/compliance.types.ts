export type DeliverableStatus = 'pendiente' | 'entregado' | 'entregado_tarde' | 'no_aplica'

export type FormatType =
  | 'taxi'
  | 'pernoctacion'
  | 'horas_extra'
  | 'disponibilidad'
  | 'schedule_6x6'
  | 'schedule_5x2'

export type ScheduleTipo = '6x6' | '5x2'
export type ScheduleEstado = 'borrador' | 'cerrado'

export type Turno =
  | 'D' | 'N' | 'S' | 'DN' | 'NS' | 'DF' | 'AUS' | 'INC'
  | 'DLD' | 'DLN' | 'L-50' | 'VAC' | 'ANT' | 'LT' | 'PS'

export interface Deliverable {
  id: string
  field: { id: string; name: string; location: string }
  supervisor: { id: string; first_name: string; last_name: string; email: string }
  mes: number
  anio: number
  format_type: FormatType
  status: DeliverableStatus
  due_date: string | null
  submitted_at: string | null
  waive_reason: string | null
  waived_by: { id: string; first_name: string; last_name: string } | null
  last_viewed_by: { id: string; first_name: string; last_name: string } | null
  last_viewed_at: string | null
  created_at: string
  updated_at: string
}

export interface MonthDetail {
  anio: number
  mes: number
  score: number | null
  on_time: number
  tarde: number
  pendiente: number
  no_aplica: number
  aplicables: number
  deliverables: Deliverable[]
}

export interface ComplianceSummaryRow {
  field_id: string
  field_name: string
  mes: string
  anio: string
  on_time: string
  tarde: string
  pendiente: string
  no_aplica: string
  score: string | null
}

export interface TaxiRecord {
  id: string
  employee: {
    id: string
    first_name: string
    last_name: string
    identification_number: string
    position: string
  }
  fecha: string
  desde: string
  hasta: string
  trayecto_taxi: string
  descripcion: string | null
  created_at: string
}

export interface PernoctacionRecord {
  id: string
  employee: {
    id: string
    first_name: string
    last_name: string
    identification_number: string
    position: string
  }
  fecha: string
  vr_dia: string
  created_at: string
}

export interface DisponibilidadRecord {
  id: string
  employee: {
    id: string
    first_name: string
    last_name: string
    identification_number: string
    position: string
  }
  fecha_inicio: string
  fecha_final: string
  valor_total: string
  descripcion: string | null
  quien_reporta: string | null
  created_at: string
}

export interface HorasExtraRecord {
  id: string
  employee: {
    id: string
    first_name: string
    last_name: string
    identification_number: string
    position: string
    salario_base: string
  }
  fecha_reporte: string
  entrada: string | null
  salida: string | null
  hed: string
  hen: string
  hfd: string
  hefd: string
  hefn: string
  rn: string
  actividad: string | null
  created_at: string
}

export type EvidenceCategory = 'ausentismo' | 'ley_50' | 'dia_familia' | 'horas_extra' | 'cronograma' | 'general'

export interface Evidence {
  id: string
  file_name: string
  drive_file_id: string
  drive_web_link: string
  anio: number | null
  mes: number | null
  category: EvidenceCategory | null
  created_at: string
  field: { id: string; name: string }
  uploaded_by: { id: string; first_name: string; last_name: string }
}

export interface EvidenceUploadResult {
  uploaded: number
  files: Evidence[]
}

export interface Schedule {
  id: string
  field: { id: string; name: string }
  supervisor: { id: string; first_name: string; last_name: string }
  mes: number
  anio: number
  tipo: ScheduleTipo
  estado: ScheduleEstado
  deliverable: Deliverable | null
  created_at: string
  updated_at: string
  employees?: Array<{
    employee: {
      id: string
      first_name: string
      last_name: string
      identification_number: string
      position: string
    }
    days: Array<{ id: string; fecha: string; turno: Turno }>
  }>
}
