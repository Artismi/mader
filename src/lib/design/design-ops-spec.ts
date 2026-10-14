/**
 * Strumenti di design per l'IA (tool "editDesign"): le stesse operazioni che
 * l'utente fa dalla barra Disponi e dai pannelli Vettoriale/Colore, descritte
 * come lista di operazioni. Lo schema è condiviso: il server lo usa per il tool,
 * lo Studio lo esegue sul canvas (src/components/studio/ai/design-ops.ts).
 *
 * Gli elementi si indicano con il loro ID (il nome che compare nello stato del canvas).
 */
import { z } from 'zod'

const ids = z.array(z.string()).min(1).describe('ID degli elementi, come nello stato del canvas')
const id = z.string().describe('ID di un elemento')
const color = z.string().describe('colore CSS, es. "#1d3557"')

export const VISUAL_TREATMENTS = ['cromo', 'oro', 'vetro', 'gonfio', 'olografico', 'ceramica', 'neon', 'tramonto', 'liquido', 'caleido', 'prisma', 'retino', 'riso', 'glitch', 'estruso', 'eco', 'linocut', 'foil', 'piatto']
export const VISUAL_SOURCE_HELP = "sorgente: 'glifo:<nome>' (Sparkle, Bloom, Starburst, Gear, Target, Globe, Twinkle, Cross Flare…), 'testo:<parola>', 'pack:<finitura o pack>' (es. pack:y2k, pack:segni, pack:collage: PNG dell'utente), 'genera:<generatore>' (membrana, rete, falce, corona, cromo, colata, vortice, costellazione…)"

export const designOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('align'), ids,
    mode: z.enum(['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom']),
    to: z.enum(['selection', 'board']).optional().describe('"board": ognuno rispetto alla sua tavola; "selection" (predefinito con 2+ elementi): rispetto al riquadro comune'),
  }),
  z.object({ op: z.literal('distribute'), ids, axis: z.enum(['h', 'v']).describe('spazi uguali in orizzontale o verticale (servono 3+ elementi)') }),
  z.object({
    op: z.literal('pathfinder'), ids,
    mode: z.enum(['union', 'subtract', 'intersect', 'exclude', 'divide']).describe('union unisce, subtract toglie dal più in basso quelli sopra, intersect tiene l’area comune, exclude buca le sovrapposizioni, divide spezza in pezzi'),
  }),
  z.object({
    op: z.literal('offset'), id, distance: z.number().describe('px, positivo = contorno più grande (bordo adesivo), negativo = più piccolo'),
    keepOriginal: z.boolean().optional().describe('tiene la forma e mette il contorno sotto (predefinito true)'),
    color: color.optional(),
  }),
  z.object({
    op: z.literal('repeat'), id, kind: z.enum(['radial', 'grid', 'mirror']),
    count: z.number().int().min(2).max(48).optional().describe('radiale: copie'),
    radius: z.number().optional().describe('radiale: raggio px'),
    rotate: z.boolean().optional().describe('radiale: copie orientate verso il centro'),
    cols: z.number().int().min(1).max(20).optional(), rows: z.number().int().min(1).max(20).optional(),
    gapX: z.number().optional(), gapY: z.number().optional(),
    brick: z.boolean().optional().describe('griglia: righe alterne sfalsate'),
    flip: z.boolean().optional().describe('griglia: copie alterne specchiate'),
    axis: z.enum(['v', 'h']).optional().describe('specchio: asse'), gap: z.number().optional().describe('specchio: distanza'),
  }),
  z.object({ op: z.literal('blend'), ids: z.array(z.string()).length(2), steps: z.number().int().min(1).max(60).optional().describe('passaggi intermedi tra i due elementi (forma, colore, posizione)') }),
  z.object({
    op: z.literal('shape'), kind: z.enum(['polygon', 'star']),
    board: z.string().optional().describe('nome della tavola: x,y diventano relative a lei'),
    x: z.number(), y: z.number(), size: z.number().describe('diametro px'),
    sides: z.number().int().min(3).max(32).optional(), inner: z.number().min(5).max(95).optional().describe('stella: rientro %'),
    round: z.number().min(0).max(100).optional().describe('arrotondamento spigoli %'),
    color: color.optional(), name: z.string().optional(),
  }),
  z.object({ op: z.literal('curveText'), id, curve: z.number().min(-100).max(100).describe('arco del testo: 100 = cerchio sopra, -100 = sotto, 0 = dritto') }),
  z.object({ op: z.literal('mask'), ids: z.array(z.string()).min(2).describe('l’elemento più in alto ritaglia gli altri (maschera di ritaglio)') }),
  z.object({
    op: z.literal('recolor'), ids: ids.optional().describe('omesso = tutto il documento'),
    map: z.record(z.string(), z.string()).optional().describe('colore vecchio → nuovo, es. {"#ff0000":"#1d3557"}'),
    palette: z.array(color).optional().describe('i colori vengono assegnati per luminosità (chiaro→chiaro)'),
    hue: z.number().min(-180).max(180).optional(), saturation: z.number().min(-100).max(100).optional(), lightness: z.number().min(-100).max(100).optional(),
  }),
  z.object({ op: z.literal('palette'), colors: z.array(color).min(1), board: z.string().optional(), x: z.number().optional(), y: z.number().optional() }),
  z.object({ op: z.literal('layer'), id, to: z.enum(['front', 'back', 'forward', 'backward']) }),
  z.object({
    op: z.literal('subject'), id,
    generator: z.enum(['punti', 'righe', 'flusso', 'isolinee', 'eco', 'blocchi', 'mosaico']).describe('generatore che legge il soggetto (persona, testo, forma)'),
    step: z.number().optional().describe('passo/densità in px'), ink: z.string().optional().describe("colore, o 'originale'"),
    bg: z.enum(['trasparente', 'carta', 'nero', 'originale']).optional(), amount: z.number().min(0).max(1).optional(), seed: z.number().optional(), invert: z.boolean().optional(),
  }),
  z.object({
    op: z.literal('visual'), board: z.string().optional().describe('nome della tavola'),
    source: z.string().describe(VISUAL_SOURCE_HELP),
    treatment: z.string().optional().describe(`trattamento: ${VISUAL_TREATMENTS.join(', ')}`),
    arrangement: z.string().optional().describe('solo (protagonista), raggiera, pioggia, specchio, griglia, eco'),
    x: z.number().optional(), y: z.number().optional(), size: z.number().optional().describe('lato in px'),
    angle: z.number().optional(), color: color.optional(), count: z.number().optional(), opacity: z.number().optional(),
    front: z.boolean().optional().describe('sopra i testi; predefinito dietro'),
  }),
  z.object({
    op: z.literal('export'), format: z.enum(['png', 'jpg', 'svg', 'pdf']),
    scale: z.number().min(1).max(4).optional(), boards: z.array(z.string()).optional().describe('nomi delle tavole; omesso = tutte'),
  }),
])

export type DesignOp = z.infer<typeof designOpSchema>

export const designOpsToolDescription = `Strumenti professionali sugli elementi ESISTENTI del canvas (come Illustrator/Figma). Indica gli elementi con gli ID dello stato del canvas.
Operazioni (campo "op"), eseguite in ordine:
- align / distribute: allinea (left, hcenter, right, top, vcenter, bottom) alla selezione o alla tavola; distribuisci con spazi uguali
- pathfinder: union, subtract, intersect, exclude, divide tra forme (non testi/immagini)
- offset: contorno a distanza (bordo adesivo / sticker: distance 12-24, keepOriginal, color bianco)
- repeat: radiale (mandala, rosoni, badge), griglia (pattern), specchio
- blend: passaggi intermedi tra due elementi
- shape: poligono o stella parametrici (lati, rientro, arrotondamento)
- curveText: testo ad arco (badge, timbri, loghi circolari)
- mask: il più in alto ritaglia gli altri
- recolor: cambia i colori di elementi o di tutto il documento (mappa, palette, tonalità/saturazione/luminosità)
- palette: mette sul canvas una striscia di campioni con i codici
- layer: porta in primo piano / sfondo
- export: scarica le tavole (png, jpg, svg, pdf)
- subject: generatore procedurale sul soggetto di un elemento (foto di persona, testo, forma): punti istanziati, righe in rilievo, linee di flusso, curve di livello, eco del contorno, blocchi in rilievo, mosaico
- visual: immagine d'impatto fatta con gli strumenti dello Studio: sorgente (glifo, parola, PNG dei pack, generatore) × trattamento (cromo, oro, vetro, gonfio, olografico, liquido, caleido, glitch…) × disposizione (solo, raggiera, pioggia, specchio, griglia, eco); va dietro ai testi
Gli elementi creati prendono nuovi ID: per lavorarci ancora rileggi lo stato del canvas nel turno successivo.`
