import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const model = google('gemini-2.5-flash')

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ColFormatSchema = z.enum(['text', 'number', 'currency_eur', 'percentage', 'date'])

const ExcelColumnSchema = z.object({
  header: z.string(),
  format: ColFormatSchema.optional().default('text'),
  width: z.number().min(8).max(60).optional(),
})

const ExcelSheetSchema = z.object({
  title: z.string(),
  columns: z.array(ExcelColumnSchema).min(1),
  // Cells: plain value strings OR Excel formulas starting with "="
  // Formula example: "=SUM(B2:B10)" or "=B2*C2" or "=IF(D2>0,\"OK\",\"KO\")"
  rows: z.array(z.array(z.string())).min(1),
  // Optional explicit totals row — if absent, engine auto-generates SUM for numeric cols
  totals_row: z.array(z.string()).optional(),
  summary: z.string().optional(),
})

const ExcelDocSchema = z.object({
  title: z.string(),
  sheets: z.array(ExcelSheetSchema).min(1),
})

const WordDocSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    paragraphs: z.array(z.string()),
  })).min(1),
})

const PptSlideSchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()).optional(),
  body: z.string().optional(),
  notes: z.string().optional(),
})

const PptDocSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  slides: z.array(PptSlideSchema).min(2),
})

// ── HyperFormula evaluator ────────────────────────────────────────────────────

type CellValue = string | number | boolean | null

/**
 * Valuta tutte le formule Excel in un foglio usando HyperFormula come motore
 * deterministico. Restituisce una matrice di valori calcolati (stessa dimensione).
 * Le celle senza formula vengono restituite invariate (parse numerica applicata).
 */
async function evaluateSheet(
  rawRows: string[][],
  colCount: number,
): Promise<CellValue[][]> {
  // Import lazy — HyperFormula è pesante, non lo carichiamo a livello modulo
  const { HyperFormula } = await import('hyperformula')

  // HyperFormula vuole matrici di "raw values" oppure formulas come stringhe
  // Passare stringhe che iniziano con "=" come formule; le altre come valori
  const sheetData: (string | number | boolean | null)[][] = rawRows.map(row =>
    Array.from({ length: colCount }, (_, c) => {
      const cell = row[c] ?? ''
      if (cell.startsWith('=')) return cell  // formula
      const num = Number(cell.replace(/[€%,\s]/g, ''))
      if (cell !== '' && !isNaN(num)) return num
      return cell
    })
  )

  const hf = HyperFormula.buildFromArray(sheetData, {
    licenseKey: 'gpl-v3',
    language: 'enGB',
  })

  const result: CellValue[][] = []
  for (let r = 0; r < sheetData.length; r++) {
    const row: CellValue[] = []
    for (let c = 0; c < colCount; c++) {
      const val = hf.getCellValue({ sheet: 0, row: r, col: c })
      if (val instanceof Error) {
        // Formula error — fallback al raw value
        row.push(rawRows[r]?.[c] ?? null)
      } else {
        row.push(val as CellValue)
      }
    }
    result.push(row)
  }

  hf.destroy()
  return result
}

// ── ExcelJS number formats ────────────────────────────────────────────────────

const NUM_FORMATS: Record<string, string> = {
  currency_eur: '€#,##0.00;[Red]-€#,##0.00',
  percentage:   '0.00%;[Red]-0.00%',
  number:       '#,##0.00;[Red]-#,##0.00',
  date:         'dd/mm/yyyy',
  text:         '@',
}

// ── Excel generator ───────────────────────────────────────────────────────────

async function generateExcel(prompt: string): Promise<{ buffer: Buffer; title: string; preview_text: string }> {
  const { object } = await generateObject({
    model,
    schema: ExcelDocSchema,
    prompt: `Genera un documento Excel professionale e strutturato per questa richiesta.

REGOLE OBBLIGATORIE:
- Usa formule Excel reali dove ha senso: =SUM(), =AVERAGE(), =IF(), =B2*C2, ecc.
- Le formule devono essere in notazione A1 relativa alla posizione nella matrice "rows" (riga 1 = prima riga di dati, non header).
- Per colonne numeriche (importi, quantità, percentuali) usa il formato corretto: currency_eur, number, percentage.
- Aggiungi una riga totals_row con =SUM() per ogni colonna numerica.
- Dati realistici e coerenti, almeno 5-8 righe di dati.
- Il titolo del foglio deve essere descrittivo.

Richiesta: ${prompt}`,
  })

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Creative OS'
  wb.created = new Date()
  wb.properties.date1904 = false

  // Inietta metadati AI compliance (Legge 132/2025)
  wb.created = new Date()
  wb.modified = new Date()

  const preview_parts: string[] = []

  for (const sheet of object.sheets) {
    const ws = wb.addWorksheet(sheet.title)
    const colCount = sheet.columns.length

    // ── 1. Valuta formule con HyperFormula ────────────────────────────────────
    const evaluated = await evaluateSheet(sheet.rows, colCount)
    let totalsEvaluated: CellValue[] | null = null
    if (sheet.totals_row) {
      const [totals] = await evaluateSheet([sheet.totals_row], colCount)
      totalsEvaluated = totals
    }

    // ── 2. Colonne: larghezze e formati ───────────────────────────────────────
    sheet.columns.forEach((col, i) => {
      const wxCol = ws.getColumn(i + 1)
      wxCol.width = col.width ?? (col.format === 'text' ? 22 : 16)
      wxCol.numFmt = NUM_FORMATS[col.format ?? 'text'] ?? '@'
    })

    // ── 3. Header row ─────────────────────────────────────────────────────────
    const headerRow = ws.addRow(sheet.columns.map(c => c.header))
    headerRow.height = 20
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      }
    })

    // ── 4. Data rows ──────────────────────────────────────────────────────────
    sheet.rows.forEach((rawRow, rowIdx) => {
      const xlRow = ws.addRow(
        rawRow.map((cell, colIdx) => {
          if (cell.startsWith('=')) {
            // Scrivi formula + result precalcolato da HyperFormula
            return { formula: cell, result: evaluated[rowIdx]?.[colIdx] ?? 0 }
          }
          // Usa il valore calcolato (numerico se possibile)
          return evaluated[rowIdx]?.[colIdx] ?? cell
        })
      )

      // Zebra striping
      if (rowIdx % 2 === 0) {
        xlRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        })
      }

      // Formato per colonne currency/percentage
      xlRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const fmt = sheet.columns[colNumber - 1]?.format
        if (fmt) cell.numFmt = NUM_FORMATS[fmt] ?? '@'
        cell.alignment = { vertical: 'middle' }
      })
    })

    // ── 5. Totals row (se presente) ───────────────────────────────────────────
    const rawTotals = sheet.totals_row
      ?? sheet.columns.map((col, i) => {
           // Auto-genera SUM per colonne numeriche
           const isNumeric = col.format && col.format !== 'text' && col.format !== 'date'
           if (!isNumeric || sheet.rows.length === 0) return ''
           const colLetter = String.fromCharCode(65 + i)
           return `=SUM(${colLetter}2:${colLetter}${sheet.rows.length + 1})`
         })

    if (rawTotals.some(t => t !== '')) {
      const totalsRow = ws.addRow(
        rawTotals.map((cell, colIdx) => {
          if (cell.startsWith('=')) {
            const calc = totalsEvaluated?.[colIdx]
              // Se non fornita dall'utente, ricalcola somme dalla matrice evaluata
              ?? evaluated.reduce((sum, r) => {
                   const v = r[colIdx]
                   return sum + (typeof v === 'number' ? v : 0)
                 }, 0)
            return { formula: cell, result: calc }
          }
          return cell
        })
      )
      totalsRow.height = 20
      totalsRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
        cell.font = { bold: true, size: 11 }
        cell.border = { top: { style: 'medium', color: { argb: 'FF94A3B8' } } }
        const fmt = sheet.columns[colNumber - 1]?.format
        if (fmt) cell.numFmt = NUM_FORMATS[fmt] ?? '@'
      })
    }

    // ── 6. Freeze header + auto-filter ───────────────────────────────────────
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: colCount },
    }

    // ── 7. AI compliance metadata nel foglio ──────────────────────────────────
    // Aggiunge una nota nascosta nel documento per conformità Legge 132/2025
    ws.getCell(1, colCount + 2).value = `Generato con assistenza AI — Creative OS — ${new Date().toLocaleDateString('it-IT')}`
    ws.getColumn(colCount + 2).hidden = true

    preview_parts.push(`${sheet.title} (${sheet.rows.length} righe)`)
  }

  // Proprietà documento per tracciabilità
  wb.creator = 'Creative OS (AI-assisted)'
  wb.lastModifiedBy = 'Creative OS'
  wb.company = 'Andrea — Artismi Design Studio'

  const buffer = Buffer.from(await wb.xlsx.writeBuffer())
  const preview = preview_parts.join(' · ')
  return { buffer, title: object.title, preview_text: preview }
}

// ── Word generator ────────────────────────────────────────────────────────────

async function generateWord(prompt: string): Promise<{ buffer: Buffer; title: string; preview_text: string }> {
  const { object } = await generateObject({
    model,
    schema: WordDocSchema,
    prompt: `Genera un documento Word ben strutturato e professionale per questa richiesta.
Includi titoli di sezione chiari e paragrafi informativi con linguaggio professionale italiano.
Richiesta: ${prompt}`,
  })

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx')
  const children: InstanceType<typeof Paragraph>[] = []

  children.push(new Paragraph({
    children: [new TextRun({ text: object.title, bold: true, size: 40, color: '1E3A8A' })],
    heading: HeadingLevel.TITLE,
    spacing: { after: 400 },
    alignment: AlignmentType.CENTER,
  }))

  // Nota AI compliance
  children.push(new Paragraph({
    children: [new TextRun({
      text: `Documento redatto con assistenza AI — Creative OS — ${new Date().toLocaleDateString('it-IT')}`,
      italics: true, size: 16, color: '94A3B8',
    })],
    spacing: { after: 600 },
    alignment: AlignmentType.CENTER,
  }))

  for (const section of object.sections) {
    children.push(new Paragraph({
      text: section.heading,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 160 },
    }))
    for (const para of section.paragraphs) {
      children.push(new Paragraph({
        children: [new TextRun({ text: para, size: 24 })],
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
      }))
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 24, color: '1E293B' },
        },
      },
    },
  })
  const buffer = await Packer.toBuffer(doc)
  const preview = object.sections.map(s => s.heading).join(' · ')
  return { buffer, title: object.title, preview_text: preview }
}

// ── PowerPoint generator ──────────────────────────────────────────────────────

async function generatePowerPoint(prompt: string): Promise<{ buffer: Buffer; title: string; preview_text: string }> {
  const { object } = await generateObject({
    model,
    schema: PptDocSchema,
    prompt: `Genera una presentazione PowerPoint professionale per questa richiesta.
Includi: slide di titolo, slides di contenuto con bullet points incisivi, slide conclusiva con call-to-action.
Ogni bullet deve essere un'affermazione completa e autonoma, non un semplice termine.
Richiesta: ${prompt}`,
  })

  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  // Definisce il master slide (branding coerente)
  pptx.defineSlideMaster({
    title: 'CREATIVE_OS_MASTER',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 5.1, w: '100%', h: 0.4, fill: { color: '1E3A8A' } } },
      { text: {
          text: `Creative OS · ${new Date().toLocaleDateString('it-IT')} · AI-assisted`,
          options: { x: 0.3, y: 5.15, w: 9, h: 0.25, fontSize: 9, color: 'FFFFFF', align: 'left' },
        },
      },
    ],
    slideNumber: { x: 9.3, y: 5.15, color: 'FFFFFF', fontSize: 9 },
  })

  // Slide titolo
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: '1E3A8A' }
  titleSlide.addShape('rect' as Parameters<typeof titleSlide.addShape>[0], {
    x: 0, y: 2.8, w: '100%', h: 0.06, fill: { color: '3B82F6' },
  })
  titleSlide.addText(object.title, {
    x: '8%', y: '30%', w: '84%', h: '22%',
    fontSize: 40, bold: true, color: 'FFFFFF', align: 'center',
  })
  if (object.subtitle) {
    titleSlide.addText(object.subtitle, {
      x: '12%', y: '57%', w: '76%', h: '12%',
      fontSize: 20, color: 'BFDBFE', align: 'center', italic: true,
    })
  }
  titleSlide.addText(`Creative OS · ${new Date().toLocaleDateString('it-IT')}`, {
    x: '8%', y: '86%', w: '84%', h: '8%',
    fontSize: 11, color: '93C5FD', align: 'center',
  })

  // Slides contenuto
  for (const slide of object.slides) {
    const s = pptx.addSlide({ masterName: 'CREATIVE_OS_MASTER' })

    // Barra colorata titolo
    s.addShape('rect' as Parameters<typeof s.addShape>[0], {
      x: 0, y: 0, w: '100%', h: 0.85, fill: { color: 'EFF6FF' },
    })
    s.addText(slide.title, {
      x: '3%', y: 0.05, w: '94%', h: 0.75,
      fontSize: 24, bold: true, color: '1E3A8A', valign: 'middle',
    })

    if (slide.bullets && slide.bullets.length > 0) {
      const items = slide.bullets.map(b => ({
        text: b,
        options: { bullet: { type: 'bullet' as const }, fontSize: 17, color: '334155', paraSpaceBefore: 8 },
      }))
      s.addText(items, { x: '4%', y: 1.0, w: '92%', h: 3.8, valign: 'top' })
    } else if (slide.body) {
      s.addText(slide.body, {
        x: '4%', y: 1.0, w: '92%', h: 3.8,
        fontSize: 16, color: '334155', valign: 'top',
      })
    }
    if (slide.notes) s.addNotes(slide.notes)
  }

  const buffer = Buffer.from(await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer)
  const preview = `${object.slides.length} slides: ${object.slides.map(s => s.title).join(', ')}`
  return { buffer, title: object.title, preview_text: preview }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface OfficeResult {
  doc_type: 'excel' | 'word' | 'powerpoint'
  title: string
  download_url: string
  preview_text: string
}

const EXTENSIONS = { excel: 'xlsx', word: 'docx', powerpoint: 'pptx' }
const MIME_TYPES = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  powerpoint: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export function detectDocType(prompt: string, hint = 'auto'): 'excel' | 'word' | 'powerpoint' {
  if (hint !== 'auto') return hint as 'excel' | 'word' | 'powerpoint'
  const p = prompt.toLowerCase()
  const ppt = ['powerpoint', 'presentazione', 'slide', 'deck', 'pitch', 'diapositive', 'slideshow']
  const xl = ['excel', 'spreadsheet', 'foglio di calcolo', 'tabella dati', 'csv', 'budget', 'bilancio']
  if (ppt.some(k => p.includes(k))) return 'powerpoint'
  if (xl.some(k => p.includes(k))) return 'excel'
  return 'word'
}

export async function generateOfficeDocument(
  prompt: string,
  docTypeHint = 'auto',
): Promise<OfficeResult & { buffer: Buffer; mimeType: string }> {
  const doc_type = detectDocType(prompt, docTypeHint)

  let buffer: Buffer
  let title: string
  let preview_text: string

  if (doc_type === 'excel') {
    ;({ buffer, title, preview_text } = await generateExcel(prompt))
  } else if (doc_type === 'word') {
    ;({ buffer, title, preview_text } = await generateWord(prompt))
  } else {
    ;({ buffer, title, preview_text } = await generatePowerPoint(prompt))
  }

  const ext = EXTENSIONS[doc_type]
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  const filename = `${slug}-${Date.now()}.${ext}`
  const tmpDir = path.join(os.tmpdir(), 'creative-os-office')
  await fs.mkdir(tmpDir, { recursive: true })
  await fs.writeFile(path.join(tmpDir, filename), buffer)

  return {
    doc_type,
    title,
    preview_text,
    download_url: `/api/ai/office/download?file=${filename}`,
    buffer,
    mimeType: MIME_TYPES[doc_type],
  }
}
