export type EstadoDotacion = 'emitida' | 'autorizada' | 'generada' | 'entregada'

export interface DotacionSpace {
  id: string
  vault_token: string
  field: { id: string; name: string }
  created_at: string
  updated_at: string
}

export interface DotacionSpaceInfo {
  space_id: string
  vault_token: string
  campo: string
  campo_id: string
}

export interface EmpleadoRepo {
  id: string
  first_name: string
  last_name: string
  position: string
}

export interface DotacionImagen {
  id: string
  url: string
  original_name: string
}

export interface Reposicion {
  id: string
  condicion_encontrada: string
  fecha_entrega: string | null
  empleado: EmpleadoRepo
  imagenes: DotacionImagen[]
}

export interface DotacionSolicitud {
  id: string
  contrato: string
  fecha: string
  inspeccion_realizada_por: string
  cargo_inspector: string
  estado: EstadoDotacion
  campo?: { id: string; name: string }
  reposiciones: Reposicion[]
  created_at: string
  firma_hse_url?: string | null
  firma_autorizador_url?: string | null
  nombre_autorizador?: string | null
  cargo_autorizador?: string | null
}

export interface CreateReposicionDto {
  empleado_id: string
  condicion_encontrada: string
  fecha_entrega?: string | null
}

export type TipoRequisicion = 'ORDINARIA' | 'EXTRAORDINARIA'

export interface DotacionRQItemDto {
  codigo?: string
  descripcion: string
  unidad: string
  tipo_requisicion?: TipoRequisicion
  valor_unitario: number
  solicitado: number
}

export interface GenerarDotacionRQDto {
  numero_rq: number
  fecha: string
  numero_contrato: string
  nombre_solicitante: string
  estado?: string
  observaciones?: string
  items: DotacionRQItemDto[]
}

export const ESTADO_DOTACION_LABELS: Record<EstadoDotacion, string> = {
  emitida:    'Emitida',
  autorizada: 'Autorizada',
  generada:   'Generada',
  entregada:  'Entregada',
}

export const ESTADO_DOTACION_COLORS: Record<EstadoDotacion, string> = {
  emitida:    '#f59e0b',
  autorizada: '#3b82f6',
  generada:   '#0891b2',
  entregada:  '#16a34a',
}
