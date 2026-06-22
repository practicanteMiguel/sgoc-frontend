export type CategoriaInsumo = 'PAPELERIA' | 'CONSUMIBLE' | 'EPP' | 'DOTACION'
export type EstadoRQ = 'ABIERTA' | 'COMPLETADA' | 'APROBADA' | 'PEDIDO_REALIZADO' | 'EN_BODEGA' | 'ENTREGADO'
export type EstadoSolicitud = 'PENDIENTE' | 'COMPLETADA' | 'GENERADA'

export interface Insumo {
  id: string
  codigo: string
  descripcion: string
  unidad: string
  valor_unitario: number | null
  categoria: CategoriaInsumo
  proveedor_ordinario: string | null
  proveedor_extraordinario: string | null
  activo: boolean
  updated_at?: string
}

export interface CreateInsumoDto {
  descripcion: string
  unidad: string
  valor_unitario?: number | null
  categoria: CategoriaInsumo
  proveedor_ordinario?: string
  proveedor_extraordinario?: string
}

export interface UpdateInsumoDto {
  valor_unitario?: number | null
  proveedor_ordinario?: string
  proveedor_extraordinario?: string
  activo?: boolean
}

export interface RQItem {
  id: string
  insumo_id: string
  codigo: string
  descripcion: string
  unidad: string
  valor_unitario: number | null
  proveedor_ordinario: string | null
  proveedor_extraordinario: string | null
  solicitado: number | null
  recibido: number | null
  total: number | null
  numero_factura: string | null
  precio_real: number | null
  proveedor_factura: string | null
}

export interface CambiarEstadoRQDto {
  estado: EstadoRQ
}

export interface FacturaItemDto {
  id: string
  numero_factura: string | null
  precio_real: number | null
  proveedor_factura?: string | null
}

export interface Requisicion {
  id: string
  numero_rq: number
  lote: number
  categoria: CategoriaInsumo
  lugar: string
  fecha: string | null
  nombre_solicitante: string | null
  numero_contrato: string | null
  estado: EstadoRQ
  total_general: number | null
  items: RQItem[]
  created_at: string
  firma_supervisor_url?: string | null
  recepcion_completada?: boolean | null
  fecha_entrega?: string | null
  firma_recepcion_url?: string | null
  total_solicitado?: number | null
  total_recibido?: number | null
  entrega_completa?: boolean | null
}

export interface RecepcionItemDto {
  id: string
  recibido: number
  es_adicional?: boolean
}

export interface RecepcionDto {
  fecha_entrega: string
  items: RecepcionItemDto[]
}

export interface RequisicionSummary {
  id: string
  numero_rq: number
  lote: number
  categoria: CategoriaInsumo
  lugar: string
  estado: EstadoRQ
  created_at: string
  mes?: number
  anio?: number
}

export interface CreateRequisicionDto {
  numero_rq: number
  categoria: CategoriaInsumo
  lote: number
  lugar: string
}

export interface LlenadoDto {
  fecha: string
  nombre_solicitante: string
  numero_contrato: string
  items: { id: string; solicitado: number }[]
}

export interface EnvioMasivoDto {
  numero_rq: number
  categoria: CategoriaInsumo
}

export interface CambioDetalle {
  campo: string
  anterior: string | number | null
  nuevo: string | number | null
}

export interface CambioInsumo {
  id: string
  codigo: string
  descripcion: string
  cambios: CambioDetalle[]
}

export interface CerrarMesDto {
  mes: number
  anio: number
}

export interface CerrarMesResult {
  notificados: number
  usuarios: string[]
}

export interface PeriodoCerrado {
  mes: number
  anio: number
  cerrado_en?: string
}

export interface InsumoBorrador {
  insumo_id: string
  codigo: string
  descripcion: string
  valor_unitario: number | null
  proveedor_ordinario: string | null
  proveedor_extraordinario: string | null
  activo: boolean | null
}

export interface EnvioMasivoResult {
  created: number
  requisiciones: Array<{ id: string; numero_rq: number; lugar: string; categoria: CategoriaInsumo }>
}

export interface PaginatedInsumos {
  data: Insumo[]
  total: number
  page: number
  limit: number
  pages: number
}

export const CATEGORIAS: CategoriaInsumo[] = ['PAPELERIA', 'CONSUMIBLE', 'EPP']

export const CATEGORIA_LABELS: Record<CategoriaInsumo, string> = {
  PAPELERIA:  'Papeleria',
  CONSUMIBLE: 'Consumible',
  EPP:        'EPP',
  DOTACION:   'Dotacion',
}

export const ESTADO_COLORS: Record<EstadoRQ, string> = {
  ABIERTA:          '#6b7280',
  COMPLETADA:       '#22c55e',
  APROBADA:         '#3b82f6',
  PEDIDO_REALIZADO: '#f59e0b',
  EN_BODEGA:        '#0891b2',
  ENTREGADO:        '#16a34a',
}

export const ESTADO_LABELS: Record<EstadoRQ, string> = {
  ABIERTA:          'Abierta',
  COMPLETADA:       'Completada',
  APROBADA:         'Aprobada',
  PEDIDO_REALIZADO: 'Pedido realizado',
  EN_BODEGA:        'En bodega',
  ENTREGADO:        'Entregado',
}

// Solicitud: un formulario por planta por mes, cubre todos los insumos
export interface SolicitudItem {
  id: string
  insumo_id?: string
  codigo: string
  descripcion: string
  unidad: string
  valor_unitario: string | number | null
  solicitado: number | null
  total: string | number | null
  es_adicional?: boolean
  proveedor?: string | null
}

export interface SolicitudCategoria {
  categoria: CategoriaInsumo
  subtotal: number
  items: SolicitudItem[]
}

export interface Solicitud {
  id: string
  lugar: string
  lote: number
  mes: number
  anio: number
  field_id?: string
  field_lugar_id?: string | null
  estado: EstadoSolicitud
  fecha: string | null
  nombre_solicitante: string | null
  numero_contrato: string | null
  total_general: number
  presupuesto: number | null
  excede_presupuesto: boolean | null
  categorias: SolicitudCategoria[]
}

export interface SolicitudResumen {
  id: string
  lugar: string
  lote: number
  mes: number
  anio: number
  field_id?: string
  field_lugar_id?: string | null
  estado: EstadoSolicitud
  created_at: string
  presupuesto: number | null
  total_general?: number | null
}

export interface EnviarPlantillasDto {
  mes: number
  anio: number
}

export interface EnviarPlantillasResult {
  enviadas: number
  solicitudes: Array<{ id: string; lugar: string; lote: number }>
}

export interface SolicitudLlenadoDto {
  fecha: string
  nombre_solicitante: string
  numero_contrato: string
  items: { id: string; solicitado: number }[]
}

export interface CreateAdicionalDto {
  descripcion: string
  unidad: string
  valor_unitario: number
  proveedor: string
  solicitado: number
  categoria: CategoriaInsumo
}

export interface UpdateAdicionalDto {
  descripcion?: string
  unidad?: string
  valor_unitario?: number
  proveedor?: string
  solicitado?: number
}

export interface AjusteSolicitadoDto {
  item_id: string
  solicitado_nuevo: number
  solicitado_original: number
}

export interface GenerarRQsDto {
  solicitud_id: string
  asignaciones: { categoria: CategoriaInsumo; numero_rq: number }[]
  ajustes?: AjusteSolicitadoDto[]
}

export interface GenerarRQsResult {
  created: number
  requisiciones: Array<{ id: string; numero_rq: number; categoria: CategoriaInsumo; lugar: string }>
}

export interface InformeRow {
  rq_id: string
  numero_rq: number
  lugar: string
  lote: number
  categoria: CategoriaInsumo
  item_id: string
  insumo_id: string
  codigo: string
  descripcion: string
  unidad: string
  proveedor_ordinario: string | null
  solicitado: number | null
  valor_unitario: number | null
  numero_factura: string | null
  precio_real: number | null
  proveedor_factura: string | null
}

export interface InformeFacturas {
  mes: number
  anio: number
  total_estimado: number
  total_real: number
  rows: InformeRow[]
}
