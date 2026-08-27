export type CategoriaHerramienta =
  | 'MANUAL'
  | 'MEDICION'
  | 'ELECTRICA'
  | 'SEGURIDAD'
  | 'SOLDADURA'
  | 'MECANICA_TUBERIA'
  | 'OBRA_CIVIL'
  | 'CAMPO'
  | 'IZAJE'
  | 'SENALIZACION'
  | 'ALMACENAMIENTO'
  | 'OTROS'

export interface Herramienta {
  id: string
  codigo: string
  categoria: CategoriaHerramienta
  descripcion: string
  marca_modelo: string | null
  unidad: string
  valor_unitario: number | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateHerramientaDto {
  categoria: CategoriaHerramienta
  descripcion: string
  marca_modelo?: string | null
  unidad?: string
  valor_unitario?: number | null
}

export interface UpdateHerramientaDto {
  categoria?: CategoriaHerramienta
  descripcion?: string
  marca_modelo?: string | null
  unidad?: string
  valor_unitario?: number | null
  activo?: boolean
}

export interface PaginatedHerramientas {
  data: Herramienta[]
  total: number
  page: number
  limit: number
  pages: number
}

export const CATEGORIAS_HERRAMIENTA: CategoriaHerramienta[] = [
  'MANUAL', 'MEDICION', 'ELECTRICA', 'SEGURIDAD', 'SOLDADURA',
  'MECANICA_TUBERIA', 'OBRA_CIVIL', 'CAMPO', 'IZAJE',
  'SENALIZACION', 'ALMACENAMIENTO', 'OTROS',
]

export const CATEGORIA_HERRAMIENTA_LABELS: Record<CategoriaHerramienta, string> = {
  MANUAL:            'Manual',
  MEDICION:          'Medicion',
  ELECTRICA:         'Electrica',
  SEGURIDAD:         'Seguridad',
  SOLDADURA:         'Soldadura',
  MECANICA_TUBERIA:  'Mecanica / Tuberia',
  OBRA_CIVIL:        'Obra civil',
  CAMPO:             'Campo',
  IZAJE:             'Izaje',
  SENALIZACION:      'Senalizacion',
  ALMACENAMIENTO:    'Almacenamiento',
  OTROS:             'Otros',
}
