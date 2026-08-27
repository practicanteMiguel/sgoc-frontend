import type { Herramienta } from './herramientas.types'

export interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateServicioDto {
  nombre: string
  descripcion?: string | null
}

export interface UpdateServicioDto {
  nombre?: string
  descripcion?: string | null
  activo?: boolean
}

export interface PaginatedServicios {
  data: Servicio[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface CuadrillaField {
  id: string
  name: string
}

export interface CuadrillaDisponible {
  id: string
  name: string
  is_soldadura: boolean
  field: CuadrillaField
  servicio_id: string | null
  servicio: Servicio | null
  created_at: string
}

export interface ServicioHerramienta {
  id: string
  servicio_id: string
  herramienta_id: string
  herramienta: Herramienta
  cantidad_exigida: number
  es_rotativa: boolean
  ubicacion: string | null
  created_at: string
  updated_at: string
}

export interface CreateServicioHerramientaDto {
  herramienta_id: string
  cantidad_exigida: number
  es_rotativa?: boolean
}

export interface UpdateServicioHerramientaDto {
  cantidad_exigida?: number
  es_rotativa?: boolean
  ubicacion?: string | null
}
