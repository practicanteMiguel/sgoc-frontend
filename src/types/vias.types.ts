export type ViaState = 'bueno' | 'regular' | 'malo' | 'critico'
export type ViaReportType = 'mensual' | 'urgente'

export interface ViaImage {
  id: string
  url: string
  original_name: string
  file_hash?: string
  uploaded_at?: string
}

export interface ViaCaptureGroup {
  id: string
  lat: number | string
  lng: number | string
  via_name: string | null
  comment: string | null
  taken_by: null | { id: string; name: string }
  captured_at: string
  images: ViaImage[]
}

export interface ViaMonthlyLogSummary {
  id: string
  field: { id: string; name: string; location?: string }
  month: number
  year: number
  vault_token: string
  created_at: string
}

export interface ViaMonthlyLog extends ViaMonthlyLogSummary {
  capture_groups: ViaCaptureGroup[]
  created_by?: { id: string; name: string }
}

export interface ViaReportItem {
  id: string
  via_name: string
  state: ViaState
  observations: string | null
  capture_group: ViaCaptureGroup | null
}

export interface ViaMapPoint {
  item_id: string
  via_name: string
  state: ViaState
  lat: number
  lng: number
  images: string[]
  captured_at: string
}

export interface ViaReport {
  id: string
  type: ViaReportType
  general_observations: string | null
  created_at: string
  monthly_log: ViaMonthlyLogSummary & { field: { id: string; name: string } }
  items: ViaReportItem[]
  map_points: ViaMapPoint[]
}

export interface PaginatedViaLogs {
  data: ViaMonthlyLogSummary[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface PaginatedViaReports {
  data: ViaReport[]
  total: number
  page: number
  limit: number
  pages: number
}

export const VIA_STATE_COLORS: Record<ViaState, string> = {
  bueno:   '#22c55e',
  regular: '#eab308',
  malo:    '#f97316',
  critico: '#ef4444',
}

export const VIA_STATE_LABELS: Record<ViaState, string> = {
  bueno:   'Bueno',
  regular: 'Regular',
  malo:    'Malo',
  critico: 'Critico',
}

export const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
