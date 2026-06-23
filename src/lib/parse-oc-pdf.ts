export interface OCPdfItem {
  descripcion: string
  cantidad: number
  total_linea: number
  valor_unitario: number  // Math.round(total_linea / cantidad)
}

export interface OCParseResult {
  serial: string            // "23428"
  proveedor: string         // "RS MACHINE S.A.S"
  rqs_mencionadas: number[] // [419, 411, 408]
  items: OCPdfItem[]
}

// ── Normalize for fuzzy matching ─────────────────────────────────────────────
export function normalizeDesc(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')      // remove special chars (? / - etc.)
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesDesc(pdfDesc: string, sysDesc: string): boolean {
  const a = normalizeDesc(pdfDesc)
  const b = normalizeDesc(sysDesc)
  return a === b || a.includes(b) || b.includes(a)
}

// ── Parse number: "44,880.00" → 44880   (comma=thousands, dot=decimal) ────────
function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ''))
}

// ── Open PDF and extract raw items + grouped lines in one pass ────────────────
type RawItem = { str: string; x: number; y: number }

async function extractPdfContent(file: File): Promise<{ lines: string[]; rawItems: RawItem[] }> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const buffer = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

  const lines:    string[]   = []
  const rawItems: RawItem[]  = []   // page-1 items with exact coordinates

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()

    const byY = new Map<number, { x: number; str: string }[]>()

    for (const item of content.items) {
      if (!('str' in item)) continue
      const pdfItem = item as { str: string; transform: number[] }
      const str = pdfItem.str?.trim()
      if (!str) continue
      const x = pdfItem.transform[4]
      const y = pdfItem.transform[5]

      // Keep raw (unbucketed) coords from page 1 for coordinate-based proveedor detection
      if (p === 1) rawItems.push({ str, x, y })

      const yBucket = Math.round(y / 2) * 2
      if (!byY.has(yBucket)) byY.set(yBucket, [])
      byY.get(yBucket)!.push({ x, str })
    }

    // Y descending (bottom-up → top-down), X ascending (left→right)
    Array.from(byY.keys())
      .sort((a, b) => b - a)
      .forEach((yKey) => {
        const row = byY.get(yKey)!
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' ')
          .trim()
        if (row) lines.push(row)
      })
  }

  return { lines, rawItems }
}

// ── Main parser ───────────────────────────────────────────────────────────────
export async function parseOCPdf(file: File): Promise<OCParseResult> {
  const { lines, rawItems } = await extractPdfContent(file)
  const text = lines.join('\n')

  // OC serial from "Y - 001 - 23428"
  const serialMatch = text.match(/Y\s*-\s*001\s*-\s*(\d+)/)
  const serial = serialMatch ? serialMatch[1] : ''

  // ── Proveedor via raw coordinates ─────────────────────────────────────────
  // "Señores" is a label at some (x, y). The proveedor value is always to its
  // RIGHT (higher X) in the same visual row. Using raw Y (not bucketed) with a
  // ±15 pt tolerance handles any Y variation between label and value columns
  // without relying on line-array positions.
  let proveedor = ''
  const senoItem = rawItems.find((it) => /Se[nñ]ores/i.test(it.str))
  if (senoItem) {
    const candidate = rawItems
      .filter((it) => {
        if (/Se[nñ]ores/i.test(it.str)) return false
        if (Math.abs(it.y - senoItem.y) > 15) return false     // same visual row
        if (it.x <= senoItem.x + 10) return false              // must be to the right
        if (/Fecha\s+(Comprobante|Entrega)/i.test(it.str)) return false
        if (/^\d/.test(it.str)) return false                   // NIT / phone numbers
        return true
      })
      .sort((a, b) => a.x - b.x)[0]   // leftmost valid item = proveedor (not Fecha cols)

    if (candidate) proveedor = candidate.str
  }

  // RQ numbers from observations section
  const rqMatches       = [...text.matchAll(/RQ(\d+)/gi)]
  const rqs_mencionadas = [...new Set(rqMatches.map((m) => parseInt(m[1])))]

  // Item lines: start with 13-digit Siigo code, end with qty + total
  // Example: "0100001000007 GAFA SPY LENTE CLARO STEELPRO 17.00 44,880.00"
  const itemRe = /^(\d{13})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([\d,]+\.\d{2})\s*$/

  const items: OCPdfItem[] = []
  for (const line of lines) {
    const m = line.match(itemRe)
    if (!m) continue
    const descripcion    = m[2].trim()
    const cantidad       = parseFloat(m[3])
    const total_linea    = parseNum(m[4])
    const valor_unitario = cantidad > 0 ? Math.round(total_linea / cantidad) : 0
    items.push({ descripcion, cantidad, total_linea, valor_unitario })
  }

  return { serial, proveedor, rqs_mencionadas, items }
}
