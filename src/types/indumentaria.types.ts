export type TipoEntrega = 'TOCACION' | 'REPOSICION' | 'PERIODICA'

export interface IndumentariaItem {
  id: string
  nombre: string
  codigo?: string | null
  unidad: string
  valor_unitario?: number | null
  proveedor?: string | null
  activo: boolean
  requiere_talla?: boolean
  created_at: string
}

export interface IndumentariaEntrega {
  id: string
  empleado_id: string
  indumentaria_id: string
  indumentaria?: IndumentariaItem
  tipo: TipoEntrega
  cantidad: number
  talla?: string | null
  fecha_entrega: string
  observacion?: string | null
  numero_rq?: string | null
  firma_url?: string | null
  registrado_por?: string | null
  entrega_batch_id?: string | null
  created_at: string
}

export interface CreateEntregaDto {
  empleado_id: string
  indumentaria_id: string
  tipo: TipoEntrega
  cantidad: number
  fecha_entrega: string
  observacion?: string
}

export type TallaCategoria = 'PANTALON' | 'CAMISA' | 'OVEROL' | 'CALZADO'

export interface EmpleadoTallaRow {
  categoria: TallaCategoria
  label: string
  talla: string | null
}

export interface EmpleadoTallaBulkRow {
  empleado_id: string
  categoria: TallaCategoria
  talla: string | null
}

export interface CensoItemResumen {
  indumentaria_id: string
  cantidad: number
  fecha_entrega: string
}

export interface CensoEmpleadoResumen {
  empleado_id: string
  items: CensoItemResumen[]
  fecha_ultima_entrega: string | null
}

export const TIPO_ENTREGA_LABELS: Record<TipoEntrega, string> = {
  TOCACION:   'Dotacion inicial',
  REPOSICION: 'Reposicion',
  PERIODICA:  'Periodica',
}
