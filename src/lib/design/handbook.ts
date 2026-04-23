/**
 * Client Handbook Loader — Creative OS 2.0
 *
 * Legge il file handbook del cliente dal vault e lo restituisce
 * come testo strutturato per gli agenti AI (Brief Enricher, Layout Architect).
 *
 * Strategia: lettura diretta del file (non RAG) — più veloce e affidabile
 * per dati strutturati con path noto. Il RAG è usato per ricerche semantiche
 * generali; il handbook è un documento specifico a path deterministico.
 */

import fs from 'fs'
import path from 'path'
import { config } from '@/lib/db'
import { FONT_PAIRS, getFontPairSummary, type FontPairKey } from './font-pairs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HandbookData {
  raw: string                    // Testo completo del file .md
  clientName: string
  fontPairKey: FontPairKey | null  // Mood scelto nel handbook
  palette: {                     // Colori estratti dal handbook (o null se mancanti)
    primary: string | null
    secondary: string | null
    accent: string | null
    bg: string | null
    textOnLight: string | null
    textOnDark: string | null
  }
  tone: string | null            // Tono di voce estratto
  targetDescription: string | null
  wordsToAvoid: string | null
  activeFormats: string[]
  hasImages: boolean             // Se esistono immagini nella cartella assets del cliente
  assetsFolderPath: string | null
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Carica il handbook di un cliente dal vault.
 * Cerca prima `[clientSlug]-handbook.md`, poi `[clientSlug].md`.
 * Restituisce null se non trovato.
 */
export function loadClientHandbook(clientNameOrSlug: string): HandbookData | null {
  const vaultPath = config.get('vault_path')
  if (!vaultPath) return null

  const slug = toSlug(clientNameOrSlug)
  const candidatePaths = [
    path.join(vaultPath, 'clienti', `${slug}-handbook.md`),
    path.join(vaultPath, 'clienti', `${clientNameOrSlug}-handbook.md`),
    path.join(vaultPath, 'clienti', `${slug}.md`),
    path.join(vaultPath, 'clienti', `${clientNameOrSlug}.md`),
  ]

  let raw: string | null = null
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      raw = fs.readFileSync(p, 'utf-8')
      break
    }
  }

  if (!raw) return null

  // Controlla assets folder
  const assetsPath = path.join(vaultPath, 'clienti', slug, 'assets')
  const hasImages = fs.existsSync(assetsPath) && fs.readdirSync(assetsPath).some(f =>
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f)
  )

  return {
    raw,
    clientName: clientNameOrSlug,
    fontPairKey: extractFontPairKey(raw),
    palette: extractPalette(raw),
    tone: extractSection(raw, 'Tono di voce'),
    targetDescription: extractSection(raw, 'Target primario'),
    wordsToAvoid: extractSection(raw, 'Parole da evitare'),
    activeFormats: extractActiveFormats(raw),
    hasImages,
    assetsFolderPath: hasImages ? assetsPath : null,
  }
}

/**
 * Restituisce il handbook come prompt-ready string per gli agenti.
 * Versione compatta: solo i dati più rilevanti per la generazione canvas.
 */
export function handbookToAgentContext(handbook: HandbookData): string {
  const fontPair = handbook.fontPairKey ? FONT_PAIRS[handbook.fontPairKey] : null
  const lines: string[] = [
    `# Brand Handbook — ${handbook.clientName}`,
  ]

  if (handbook.tone) lines.push(`**Tono di voce:** ${handbook.tone}`)
  if (handbook.targetDescription) lines.push(`**Target:** ${handbook.targetDescription}`)
  if (handbook.wordsToAvoid) lines.push(`**Parole da evitare:** ${handbook.wordsToAvoid}`)

  if (fontPair) {
    lines.push(`**Typography mood:** ${handbook.fontPairKey} — ${fontPair.label}`)
    lines.push(`  Heading: ${fontPair.heading.family} ${fontPair.heading.weight}`)
    lines.push(`  Body: ${fontPair.body.family} ${fontPair.body.weight}`)
  }

  const p = handbook.palette
  if (p.primary || p.accent) {
    lines.push(`**Palette:**`)
    if (p.bg) lines.push(`  Background: ${p.bg}`)
    if (p.primary) lines.push(`  Primario: ${p.primary}`)
    if (p.secondary) lines.push(`  Secondario: ${p.secondary}`)
    if (p.accent) lines.push(`  Accento: ${p.accent}`)
  }

  if (handbook.activeFormats.length > 0) {
    lines.push(`**Formati attivi:** ${handbook.activeFormats.join(', ')}`)
  }

  if (handbook.hasImages) {
    lines.push(`**Assets:** immagini disponibili in ${handbook.assetsFolderPath}`)
  }

  return lines.join('\n')
}

/**
 * Restituisce il summary dei font pairs disponibili per il Layout Architect.
 * Usato come "menu" dall'agente per scegliere il mood.
 */
export function getAvailableFontPairsForAgent(): string {
  return `## Font Pairs disponibili\n\n${getFontPairSummary()}\n\n` +
    `Scegli il mood più adatto al brand. Se il handbook ha già un mood definito, usalo.\n` +
    `Se il brief non specifica nulla, deduci il mood dalla palette, dal settore e dal tono.`
}

// ─── Extractors (parsing leggero del markdown) ────────────────────────────────

function extractFontPairKey(raw: string): FontPairKey | null {
  const match = raw.match(/\*\*Font Pair Mood:\*\*\s*\[?(luxury|editorial|brutalist|minimal|fashion|tech|street|retro|cyber|calligraphy)\]?/i)
  return match ? (match[1].toLowerCase() as FontPairKey) : null
}

function extractPalette(raw: string) {
  const extract = (label: string) => {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(#[0-9A-Fa-f]{3,6})`, 'i')
    const m = raw.match(re)
    return m ? m[1] : null
  }
  return {
    primary:     extract('Colore primario'),
    secondary:   extract('Colore secondario'),
    accent:      extract('Colore accento'),
    bg:          extract('Colore sfondo preferito'),
    textOnLight: extract('Colore testo su sfondo chiaro'),
    textOnDark:  extract('Colore testo su sfondo scuro'),
  }
}

function extractSection(raw: string, label: string): string | null {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i')
  const match = raw.match(re)
  if (!match) return null
  const val = match[1].trim()
  // Ignora i placeholder del template
  if (val.startsWith('[') || val === '') return null
  return val
}

function extractActiveFormats(raw: string): string[] {
  const formats: string[] = []
  const checks = [
    { label: 'Instagram Feed', key: 'instagram_feed' },
    { label: 'Instagram Stories/Reels', key: 'instagram_stories' },
    { label: 'LinkedIn', key: 'linkedin' },
    { label: 'Facebook', key: 'facebook' },
    { label: 'Newsletter', key: 'newsletter' },
  ]
  for (const { label, key } of checks) {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*sì`, 'i')
    if (re.test(raw)) formats.push(key)
  }
  return formats
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
