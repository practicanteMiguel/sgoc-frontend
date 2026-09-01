import type { Herramienta } from './herramientas.types'

export type TipoMovimientoCustodia = 'PRESTAMO' | 'BOVEDA' | 'DEVOLUCION'

export interface CustodiaDestinoCrew { id: string; name: string }

export interface CustodiaDestino {
  destino:
    | { tipo: 'CUADRILLA'; crew: CustodiaDestinoCrew | null }
    | { tipo: 'BOVEDA'; crew: null }
  crew_destino_id: string | null
  cantidad: number
}

export interface CustodiaHerramientaCrew {
  herramienta: Herramienta
  cantidad_entregada: number
  cantidad_en_poder: number
  prestado_o_cedido: CustodiaDestino[]
}

export interface CustodiaRecibidaItem {
  herramienta: Herramienta
  crew_origen: CustodiaDestinoCrew | null
  cantidad: number
}

export interface FondoComunHerramienta {
  herramienta: Herramienta
  servicio_herramienta_id: string | null
  ubicacion: string | null
  cantidad_total: number
  cedido_por: { crew_origen: CustodiaDestinoCrew; cantidad: number }[]
}

export interface MovimientoCustodiaHistorial {
  id: string
  tipo: TipoMovimientoCustodia
  herramienta: Herramienta
  servicio: { id: string; nombre: string }
  cantidad: number
  fecha: string
  observacion: string | null
  rol: 'ORIGEN' | 'DESTINO'
  crew_origen: CustodiaDestinoCrew
  crew_destino: CustodiaDestinoCrew | null
  de_fondo_comun: boolean
}
