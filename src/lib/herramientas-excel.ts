import { api } from '@/src/lib/axios'
import {
  CATEGORIAS_HERRAMIENTA, CATEGORIA_HERRAMIENTA_LABELS, VIDA_UTIL_REFERENCIA,
} from '@/src/types/herramientas.types'
import type { CategoriaHerramienta, Herramienta, PaginatedHerramientas } from '@/src/types/herramientas.types'

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A6B6B' } } as const
const thin         = { style: 'thin' } as const
const allBorders   = { top: thin, bottom: thin, left: thin, right: thin }
const HEADERS      = ['Categoria', 'Descripcion', 'Marca/Modelo', 'Unidad', 'Valor Unitario', 'Vida Útil (Años)']
const COL_WIDTHS   = [22, 42, 26, 12, 16, 16]

async function getExcelJS() {
  const excelModule = await import('exceljs')
  return (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
}

function descargar(buf: BlobPart, nombre: string) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

// ── Plantilla vacia para carga masiva ────────────────────────────────────────
export async function descargarPlantillaHerramientas() {
  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Herramientas')
  ws.columns = COL_WIDTHS.map(width => ({ width }))

  const hdrRow = ws.getRow(1)
  HEADERS.forEach((h, i) => {
    const cell     = hdrRow.getCell(i + 1)
    cell.value     = h
    cell.fill      = HEADER_FILL
    cell.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border    = allBorders
  })
  hdrRow.height = 22

  // Fila de ejemplo, en gris para distinguirla de datos reales.
  const ejemplo = ws.getRow(2)
  const valoresEjemplo = ['Manual', 'Llave de tubo 14 pulgadas', 'Stanley', 'UND', 45000, 3]
  valoresEjemplo.forEach((v, i) => {
    const cell  = ejemplo.getCell(i + 1)
    cell.value  = v
    cell.font   = { italic: true, color: { argb: 'FF9CA3AF' } }
    cell.border = allBorders
  })

  // Dropdown de categorias validas en la columna A, filas 2 a 500.
  const opciones = CATEGORIAS_HERRAMIENTA.map(c => CATEGORIA_HERRAMIENTA_LABELS[c]).join(',')
  for (let r = 2; r <= 500; r++) {
    ws.getCell(`A${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${opciones}"`],
      showErrorMessage: true,
      errorTitle: 'Categoria invalida',
      error: 'Selecciona una categoria de la lista desplegable',
    }
  }

  agregarHojaReferenciaVidaUtil(wb)

  const buf = await wb.xlsx.writeBuffer()
  descargar(buf, 'plantilla-herramientas.xlsx')
}

// ── Hoja de referencia: vida util estimada por categoria ────────────────────
function agregarHojaReferenciaVidaUtil(wb: import('exceljs').Workbook) {
  const ws = wb.addWorksheet('Referencia - Vida util')
  const headers = ['Categoria', 'Uso diario / pesado (años)', 'Uso ocasional / liviano (años)', 'Nota']
  ws.columns = [22, 24, 26, 70].map(width => ({ width }))

  const hdrRow = ws.getRow(1)
  headers.forEach((h, i) => {
    const cell     = hdrRow.getCell(i + 1)
    cell.value     = h
    cell.fill      = HEADER_FILL
    cell.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border    = allBorders
  })
  hdrRow.height = 30

  VIDA_UTIL_REFERENCIA.forEach((v, i) => {
    const row = ws.getRow(i + 2)
    const bg  = i % 2 === 1 ? 'FFF3F4F6' : 'FFFFFFFF'
    const valores = [
      CATEGORIA_HERRAMIENTA_LABELS[v.categoria], v.anios_uso_intensivo, v.anios_uso_moderado, v.nota,
    ]
    valores.forEach((val, ci) => {
      const cell     = row.getCell(ci + 1)
      cell.value     = val
      cell.border    = allBorders
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.font      = { size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: ci === 3, horizontal: ci === 3 ? 'left' : 'center' }
    })
    row.height = 46
  })

  const notaFinal = ws.getRow(VIDA_UTIL_REFERENCIA.length + 3)
  notaFinal.getCell(1).value = 'Estos años son un punto de partida orientativo, no un valor fijo: ajusta la vida útil real de cada herramienta según su uso y estado.'
  notaFinal.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
  ws.mergeCells(notaFinal.number, 1, notaFinal.number, 4)
}

// ── Exportar catalogo actual (respeta los filtros activos) ──────────────────
export async function exportarCatalogoHerramientas(filtros: {
  categoria?: CategoriaHerramienta
  search?:    string
  activo?:    boolean
}) {
  const { data } = await api.get<PaginatedHerramientas>('/herramientas', {
    params: { page: 1, limit: 2000, ...filtros },
  })

  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Catalogo Herramientas')

  const headers = ['Codigo', ...HEADERS, 'Estado']
  ws.columns = [12, ...COL_WIDTHS, 12].map(width => ({ width }))

  const hdrRow = ws.getRow(1)
  headers.forEach((h, i) => {
    const cell     = hdrRow.getCell(i + 1)
    cell.value     = h
    cell.fill      = HEADER_FILL
    cell.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border    = allBorders
  })
  hdrRow.height = 22

  const copFmt = '"$"#,##0'
  const filas: Herramienta[] = data.data
  filas.forEach((h, i) => {
    const row = ws.getRow(i + 2)
    const bg  = i % 2 === 1 ? 'FFF3F4F6' : 'FFFFFFFF'
    const valorUnitario = h.valor_unitario != null ? Number(h.valor_unitario) : null
    const valores = [
      h.codigo, CATEGORIA_HERRAMIENTA_LABELS[h.categoria], h.descripcion,
      h.marca_modelo ?? '', h.unidad, valorUnitario, h.vida_util_anios ?? '', h.activo ? 'Activo' : 'Inactivo',
    ]
    valores.forEach((v, ci) => {
      const cell     = row.getCell(ci + 1)
      cell.value     = v ?? ''
      cell.border    = allBorders
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.font      = { size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: ci === 2 }
      if (ci === 5 && typeof v === 'number') cell.numFmt = copFmt
    })
  })

  const buf   = await wb.xlsx.writeBuffer()
  const fecha = new Date().toISOString().split('T')[0]
  descargar(buf, `catalogo-herramientas-${fecha}.xlsx`)
}
