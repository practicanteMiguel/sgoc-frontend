import type { Herramienta } from './herramientas.types'
import type { CrewEmployee } from './activities.types'

export type EstadoHerramientaEntrega = 'NUEVO' | 'OPTIMO' | 'REGULAR'

export const ESTADOS_HERRAMIENTA: EstadoHerramientaEntrega[] = ['NUEVO', 'OPTIMO', 'REGULAR']

export const ESTADO_HERRAMIENTA_LABELS: Record<EstadoHerramientaEntrega, string> = {
  NUEVO:   'Nuevo',
  OPTIMO:  'Optimo',
  REGULAR: 'Regular',
}

export const ESTADO_HERRAMIENTA_COLORS: Record<EstadoHerramientaEntrega, string> = {
  NUEVO:   '#16a34a',
  OPTIMO:  '#3b82f6',
  REGULAR: '#f59e0b',
}

export interface EntregaHerramientaItem {
  id: string
  entrega_id: string
  herramienta_id: string
  herramienta: Herramienta
  cantidad_entregada: number
  cantidad_exigida_snapshot: number | null
  es_adicional: boolean
  estado: EstadoHerramientaEntrega
  valor_unitario: number | null
  created_at: string
}

export interface EntregaHerramientaCrew {
  id: string
  crew_id: string
  servicio_id: string
  servicio?: { id: string; nombre: string }
  fecha_entrega: string
  recibido_empleado_id: string | null
  recibido_empleado: CrewEmployee | null
  firma_url: string
  observacion: string | null
  items: EntregaHerramientaItem[]
  created_at: string
}

export interface ResumenHerramientaCrew {
  herramienta: Herramienta
  cantidad_exigida: number
  cantidad_entregada_acumulada: number
}

export interface ResumenHerramientasCrewResponse {
  exigidas: ResumenHerramientaCrew[]
  adicionales: EntregaHerramientaItem[]
}

export interface RegistrarEntregaHerramientasItemDto {
  herramienta_id: string
  cantidad_entregada: number
  estado: EstadoHerramientaEntrega
  es_adicional?: boolean
}

export interface InformeHerramientasCrew {
  id: string
  name: string
  field: { id?: string; name?: string }
  activa: boolean
}

export interface InformeHerramientasItem {
  herramienta_id: string
  herramienta?: Herramienta
  es_adicional: boolean
  cantidad_exigida_por_cuadrilla: number
  entregado_por_cuadrilla: Record<string, number>
  total_licitado: number
  valor_unitario: number
  valor_total_contrato: number
  total_entregado: number
  valor_total_entregado: number
}

export interface InformeHerramientasServicio {
  crews: InformeHerramientasCrew[]
  numCuadrillas: number
  items: InformeHerramientasItem[]
  totales: {
    total_licitado: number
    valor_total_contrato: number
    total_entregado: number
    valor_total_entregado: number
  }
}

export interface StockHerramientaCrew {
  herramienta: Herramienta
  cantidad: number
}

export interface RetiroHerramientaCrew {
  id: string
  crew_id: string
  servicio_id: string
  servicio?: { id: string; nombre: string }
  herramienta_id: string
  herramienta: Herramienta
  cantidad: number
  fecha: string
  motivo: string | null
  valor_unitario: number | null
  created_at: string
}

export interface RegistrarRetiroDto {
  herramienta_id: string
  cantidad: number
  fecha: string
  motivo?: string
}

export interface TendenciaMensualPunto {
  mes: string
  valor_invertido: number
  valor_retirado: number
  valor_acumulado: number
}
