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
  vida_util_anios: number | null
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
  vida_util_anios?: number | null
}

export interface UpdateHerramientaDto {
  categoria?: CategoriaHerramienta
  descripcion?: string
  marca_modelo?: string | null
  unidad?: string
  valor_unitario?: number | null
  vida_util_anios?: number | null
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

export interface BulkImportHerramientasResult {
  creadas: number
  herramientas: Herramienta[]
}

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

export interface VidaUtilReferencia {
  categoria: CategoriaHerramienta
  anios_uso_intensivo: number
  anios_uso_moderado: number
  nota: string
}

// Referencia de vida util estimada por categoria (uso intensivo = diario o
// pesado en campo, uso moderado = ocasional/liviano), para orientar al
// usuario al crear una herramienta o cargar el catalogo masivamente. Son
// solo un punto de partida ajustable por herramienta.
export const VIDA_UTIL_REFERENCIA: VidaUtilReferencia[] = [
  { categoria: 'MANUAL', anios_uso_intensivo: 2, anios_uso_moderado: 5,
    nota: 'Herramienta de mano (llaves, alicates, martillos): es la que mas rota, con desgaste por friccion/impacto y perdida frecuente en campo.' },
  { categoria: 'MEDICION', anios_uso_intensivo: 3, anios_uso_moderado: 7,
    nota: 'Instrumentos de precision (calibradores, flexometros, multimetros): la parte mecanica dura mas, lo electronico se degrada antes. Requiere calibracion periodica.' },
  { categoria: 'ELECTRICA', anios_uso_intensivo: 3, anios_uso_moderado: 6,
    nota: 'Herramienta electrica/motorizada (taladros, pulidoras): el motor y las escobillas se desgastan con uso diario; las de cable suelen durar mas que las de bateria.' },
  { categoria: 'SEGURIDAD', anios_uso_intensivo: 2, anios_uso_moderado: 5,
    nota: 'EPP (arneses, cascos): muchos fabricantes fijan una vida util maxima aunque no se vea desgaste (ej. arneses ~5 anos desde el primer uso). Retirar de inmediato tras cualquier caida o impacto, sin importar la edad.' },
  { categoria: 'SOLDADURA', anios_uso_intensivo: 3, anios_uso_moderado: 7,
    nota: 'Equipos de soldadura: la maquina dura mas si se mantiene; cascos y accesorios se deterioran mas rapido con uso diario.' },
  { categoria: 'MECANICA_TUBERIA', anios_uso_intensivo: 3, anios_uso_moderado: 6,
    nota: 'Herramienta mecanica robusta (llaves de tubo, terrajas): buena resistencia si se mantiene y engrasa.' },
  { categoria: 'OBRA_CIVIL', anios_uso_intensivo: 2, anios_uso_moderado: 4,
    nota: 'Herramienta de obra civil (palas, carretillas): desgaste abrasivo alto por contacto constante con tierra y concreto.' },
  { categoria: 'CAMPO', anios_uso_intensivo: 3, anios_uso_moderado: 6,
    nota: 'Equipo general de campo: la vida util real varia mucho segun el item concreto.' },
  { categoria: 'IZAJE', anios_uso_intensivo: 4, anios_uso_moderado: 8,
    nota: 'Aparejos de izaje (eslingas, grilletes, aparejos): el retiro depende mas de la inspeccion periodica obligatoria (cada 12 meses) que de la edad por si sola.' },
  { categoria: 'SENALIZACION', anios_uso_intensivo: 2, anios_uso_moderado: 5,
    nota: 'Senalizacion plastica expuesta a la intemperie: se degrada por rayos UV y clima; se vuelve quebradiza.' },
  { categoria: 'ALMACENAMIENTO', anios_uso_intensivo: 5, anios_uso_moderado: 10,
    nota: 'Cajas y gabinetes metalicos: bajo desgaste mecanico; la corrosion en ambiente costero/industrial es el principal limitante.' },
  { categoria: 'OTROS', anios_uso_intensivo: 3, anios_uso_moderado: 5,
    nota: 'Valor generico de referencia cuando la herramienta no encaja en otra categoria.' },
]

export const VIDA_UTIL_POR_CATEGORIA: Record<CategoriaHerramienta, VidaUtilReferencia> = Object.fromEntries(
  VIDA_UTIL_REFERENCIA.map(v => [v.categoria, v]),
) as Record<CategoriaHerramienta, VidaUtilReferencia>
