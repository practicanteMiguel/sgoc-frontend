export interface CrewField {
  id: string
  name: string
  location: string
}

export interface CrewEmployee {
  id: string
  first_name: string
  last_name: string
  position: string
  identification_number: string
}

export interface Crew {
  id: string
  name: string
  is_soldadura: boolean
  field: CrewField
  employees: CrewEmployee[]
  created_at: string
}

export interface PaginatedCrews {
  data: Crew[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface Activity {
  id: string
  description: string
  start_date: string
  end_date: string
  notes: string | null
  requirement: string | null
  additional_resource: string | null
  progress: string | null
  is_scheduled: boolean | null
  image_before: string | null
  image_during: string | null
  image_after: string | null
  created_at: string
}

export interface WeeklyLogSummary {
  id: string
  week_number: number
  year: number
  crew: { id: string; name: string }
  created_at: string
}

export interface WeeklyLog {
  id: string
  week_number: number
  year: number
  vault_token: string
  crew: { id: string; name: string; field: CrewField }
  activities: Activity[]
  created_at: string
}

export interface VaultImage {
  id: string
  url: string
  public_id: string
  original_name: string
  is_assigned: boolean
  uploaded_at: string
}

export interface TechnicalReportLog {
  id: string
  week_number: number
  year: number
  activities: Activity[]
}

export interface TechnicalReport {
  id: string
  crew: { id: string; name: string; is_soldadura?: boolean; field?: CrewField }
  weekly_log: TechnicalReportLog
  created_at: string
}

export interface PaginatedReports {
  data: TechnicalReport[]
  total: number
  page: number
  limit: number
  pages: number
}

export const REQUIREMENT_OPTIONS = [
  'Eventos Ambientales - Seguridad de Procesos',
  'Produccion - Diferidas',
  'Cumplimiento Legal (ANLA-ANH-CAM-OPC)',
  'Cierre de Acciones (Hallazgos - Fallas de Control)',
  'HouseKeeping (Roceria - Limpieza - Pintura)',
  'Trabajo Rutinario',
] as const

export type Requirement = (typeof REQUIREMENT_OPTIONS)[number]
