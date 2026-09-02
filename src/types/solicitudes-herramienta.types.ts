import type { CategoriaHerramienta, Herramienta } from './herramientas.types'

export type TipoSolicitudHerramienta = 'DANO' | 'NUEVA'
export type EstadoSolicitudHerramienta = 'PENDIENTE' | 'ATENDIDA'

export const TIPO_SOLICITUD_LABELS: Record<TipoSolicitudHerramienta, string> = {
  DANO: 'Herramienta dañada',
  NUEVA: 'Herramienta nueva',
}

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitudHerramienta, string> = {
  PENDIENTE: 'Pendiente',
  ATENDIDA: 'Atendida',
}

export const ESTADO_SOLICITUD_COLORS: Record<EstadoSolicitudHerramienta, string> = {
  PENDIENTE: '#f59e0b',
  ATENDIDA: '#16a34a',
}

export interface HerramientaSinValor {
  id: string
  codigo: string
  categoria: CategoriaHerramienta
  descripcion: string
  marca_modelo: string | null
  unidad: string
}

export interface PersonaResumen {
  id: string
  first_name: string
  last_name: string
}

export interface SolicitudHerramienta {
  id: string
  crew_id: string
  crew: { id: string; name: string; field?: { id: string; name: string } }
  servicio_id: string | null
  servicio: { id: string; nombre: string } | null
  herramienta_id: string
  herramienta: Herramienta
  tipo: TipoSolicitudHerramienta
  motivo: string
  estado: EstadoSolicitudHerramienta
  respuesta: string | null
  solicitado_por: PersonaResumen | null
  atendido_por: PersonaResumen | null
  atendido_at: string | null
  created_at: string
}

export interface CrearSolicitudHerramientaDto {
  crew_id: string
  herramienta_id: string
  tipo: TipoSolicitudHerramienta
  motivo: string
}

export interface AtenderSolicitudHerramientaDto {
  respuesta?: string
}

export interface HerramientaCampoResumen {
  herramienta: HerramientaSinValor
  cantidad: number
}

export interface CuadrillaCampoSupervisor {
  id: string
  name: string
  field: { id?: string; name?: string }
  num_integrantes: number
  herramientas: HerramientaCampoResumen[]
}

export interface EstadisticasCampoSupervisor {
  num_cuadrillas: number
  total_herramientas: number
  por_categoria: { categoria: CategoriaHerramienta; cantidad: number }[]
  solicitudes_pendientes: number
}
