/**
 * Affinità tra stile e soggetto: un caffè di pregio non esce in manga, una
 * clinica non esce in pixel. Il settore si legge dalle parole del contenuto;
 * per ogni settore alcuni archetipi si escludono (non entrano nel vivaio e il
 * critico li boccia) e altri si penalizzano. Le scritte decorative (onomatopee,
 * katakana) solo se il tono lo consente. Se il brief chiama quel mondo per nome
 * ("fumetto", "videogioco", "anime"…) l'archetipo torna ammesso.
 */
import type { DesignContent } from '../types'

export type Settore = 'pregio' | 'cultura' | 'cibo' | 'sport' | 'salute' | 'professioni' | 'bambini' | 'tech' | 'giovani'

const PAROLE: Record<Settore, RegExp> = {
  pregio: /\b(pregio|specialty|monorigine|selezion\w*|lusso|premium|degustazion\w*|sommelier|boutique|atelier|gioiell\w*|tostatur\w*|torrefazion\w*|cantina|riserva|sartori\w*|artigian\w*|haute|esclusiv\w*)\b/,
  cultura: /\b(mostra|museo|galleria|libr[oi]|teatro|concerto|festival|biblioteca|poesia|conferenza|talk|archivio|cultura)\b/,
  cibo: /\b(menu|menù|ristorante|trattoria|osteria|pizzeria|cucina|piatt[oi]|chef|forno|panetteria|pasticceria|bistrot|caff[eè]|bar|aperitivo|vino|vini)\b/,
  sport: /\b(palestra|gym|fitness|allenament\w*|crossfit|yoga|pilates|boxe|calcio|corsa|maratona|sport\w*)\b/,
  salute: /\b(clinica|medic\w*|dentist\w*|terapi\w*|ospedale|farmacia|salute|psicolog\w*|fisioterapi\w*|benessere)\b/,
  professioni: /\b(studio legale|avvocat\w*|commercialist\w*|notai\w*|consulenz\w*|assicurazion\w*|banca|immobiliare)\b/,
  bambini: /\b(bambin\w*|scuola|asilo|ludoteca|compleanno|giocattol\w*|ragazzi)\b/,
  tech: /\b(app|software|startup|developer|intelligenza artificiale|cloud|hackathon)\b/,
  giovani: /\b(festa|party|serata|dj|club|street|skate|rave|giovani|fumett\w*|manga|anime|videogioc\w*|gaming|arcade|8.?bit)\b/,
}

/** Archetipi fuori luogo per settore: escludi (mai), penalizza (solo se il resto manca). */
const TABELLA: Partial<Record<Settore, { escludi: string[]; penalizza: string[] }>> = {
  pregio: { escludi: ['manga', 'pixel', 'fumetto', 'memphis', 'acido', 'terminale', 'sorveglianza'], penalizza: ['zine', 'brutale', 'interfaccia', 'aero', 'strilli'] },
  cultura: { escludi: ['pixel', 'fumetto', 'manga'], penalizza: ['strilli', 'scontrino', 'terminale', 'aero'] },
  cibo: { escludi: ['terminale', 'sorveglianza'], penalizza: ['manga', 'pixel', 'interfaccia', 'acido'] },
  sport: { escludi: ['acquerello', 'calligrafico'], penalizza: ['manga', 'fumetto', 'pixel', 'polaroid'] },
  salute: { escludi: ['manga', 'pixel', 'fumetto', 'acido', 'brutale', 'sorveglianza', 'memphis'], penalizza: ['zine', 'strilli', 'deformato'] },
  professioni: { escludi: ['manga', 'pixel', 'fumetto', 'acido', 'memphis', 'zine'], penalizza: ['brutale', 'deformato', 'strilli', 'aero'] },
}
/** Parole che chiamano per nome un mondo grafico: l'archetipo resta ammesso. */
const RICHIAMO: Record<string, RegExp> = {
  manga: /\b(manga|anime|giappon\w*|tokyo|ramen|sushi)\b/, pixel: /\b(pixel|videogioc\w*|gaming|arcade|8.?bit|retro ?game)\b/,
  fumetto: /\b(fumett\w*|comics?|supereroi\w*)\b/, terminale: /\b(codice|terminale|hacker|developer)\b/,
}

const testo = (c: DesignContent) => [c.brand, c.kicker, c.title, c.body, c.imageQuery, ...(c.details ?? [])].filter(Boolean).join(' ').toLowerCase()

/** I settori del contenuto (può essere più d'uno: «caffè di pregio» è cibo e pregio). */
export function settori(c: DesignContent): Settore[] {
  const t = testo(c)
  return (Object.keys(PAROLE) as Settore[]).filter(s => PAROLE[s].test(t))
}

/** 'esclusa' | 'lontana' | 'ok': quanto un archetipo (o sistema) sta bene col soggetto. */
export function affinita(c: DesignContent, id: string): 'esclusa' | 'lontana' | 'ok' {
  const t = testo(c)
  if (RICHIAMO[id]?.test(t)) return 'ok'
  const ss = settori(c)
  if (ss.some(s => TABELLA[s]?.escludi.includes(id))) return 'esclusa'
  if (ss.some(s => TABELLA[s]?.penalizza.includes(id))) return 'lontana'
  return 'ok'
}

/** Onomatopee decorative (BAM!, SBAM!) solo con un tono giocoso, giovane o per bambini. */
export function onomatopeeAmmesse(c: DesignContent) {
  const ss = settori(c)
  return (ss.includes('giovani') || ss.includes('bambini')) && !ss.some(s => s === 'pregio' || s === 'salute' || s === 'professioni')
}
/** Scritte in giapponese solo se il brief parla di Giappone o di manga. */
export const giapponeseAmmesso = (c: DesignContent) => RICHIAMO.manga.test(testo(c))
