export type TipoEntrega = 'TOCACION' | 'REPOSICION'

export interface IndumentariaItem {
  id: string
  nombre: string
  codigo?: string | null
  unidad: string
  valor_unitario?: number | null
  proveedor?: string | null
  activo: boolean
  created_at: string
}

export interface IndumentariaEntrega {
  id: string
  empleado_id: string
  indumentaria_id: string
  indumentaria?: IndumentariaItem
  tipo: TipoEntrega
  cantidad: number
  fecha_entrega: string
  observacion?: string | null
  registrado_por?: string | null
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

export const TIPO_ENTREGA_LABELS: Record<TipoEntrega, string> = {
  TOCACION:   'Dotacion inicial',
  REPOSICION: 'Reposicion',
}
