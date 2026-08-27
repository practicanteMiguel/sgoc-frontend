import type { Herramienta } from './herramientas.types'

export type TipoMovimientoBoveda = 'INGRESO' | 'PRESTAMO' | 'DEVOLUCION' | 'BAJA'

export interface CuadrillaBoveda {
  crew_id: string
  crew_name: string
  field_name: string
  cantidad: number
  fecha_ultimo_movimiento: string
}

export interface BovedaResumen {
  herramienta: Herramienta
  cantidad_exigida: number
  ubicacion: string | null
  stock_disponible: number
  en_cuadrillas: CuadrillaBoveda[]
}

export interface MovimientoBovedaCrew {
  id: string
  name: string
}

export interface MovimientoBoveda {
  id: string
  servicio_herramienta_id: string
  tipo: TipoMovimientoBoveda
  crew: MovimientoBovedaCrew | null
  crew_id: string | null
  cantidad: number
  fecha: string
  traslado_grupo_id: string | null
  observacion: string | null
  created_at: string
}

export type EstadoMovimientoBovedaCrew = 'ENTREGADA' | 'DEVUELTA'

export interface MovimientoBovedaCrewHistorial {
  id: string
  tipo: TipoMovimientoBoveda
  herramienta: Herramienta
  servicio: { id: string; nombre: string }
  cantidad: number
  fecha: string
  observacion: string | null
  es_traslado: boolean
  otra_cuadrilla: { id: string; name: string } | null
  estado: EstadoMovimientoBovedaCrew
}
