/**
 * Archetipi: impaginazioni procedurali nate dalle ricette d'ispirazione del
 * vault (vault/ricette/*.md) e dalla storia della grafica. Ognuno è una
 * famiglia con varianti interne (il seme sceglie), parla i registri indicati e
 * si regola con gli stessi regolatori dei sistemi. Qui solo l'elenco (nomi,
 * idea, ricetta, registri): le composizioni stanno nei file dei gruppi.
 */
import type { RegistroId } from '../../styles'

export interface ArchetipoInfo {
  id: string
  nome: string
  idea: string
  foto: 'serve' | 'meglio' | 'no'
  /** ricetta del vault da cui nasce (vault/ricette/<ricetta>.md) */
  ricetta?: string
  /** registri in cui l'archetipo è di casa */
  registri: RegistroId[]
  gruppo: 'a' | 'b' | 'c' | 'd'
}

export const ARCHETIPI = [
  /* ── A · editoriale e tipografico ── */
  { id: 'manifesto', gruppo: 'a', nome: 'Manifesto svizzero', foto: 'meglio', ricetta: 'swiss-minimal-01', registri: ['svizzero', 'editoriale', 'tech'], idea: 'griglia asimmetrica a 12 colonne, titolo enorme a bandiera, filetti e colonne di informazioni numerate, foto in un modulo' },
  { id: 'scalinata', gruppo: 'a', nome: 'Scalinata', foto: 'meglio', ricetta: 'typoalchemy-01', registri: ['avanguardia', 'editoriale', 'notte', 'sportivo'], idea: 'le parole del titolo scendono a gradini in diagonale, ognuna allineata alla fine della precedente; foto che riempie il triangolo vuoto' },
  { id: 'strilli', gruppo: 'a', nome: 'Copertina con strilli', foto: 'serve', ricetta: 'magazine-cutout-01', registri: ['editoriale', 'pop', 'lusso'], idea: 'testata gigante in alto dietro il soggetto, foto a tutta pagina, strilli di copertina ai lati con numeri e filetti, codice a barre' },
  { id: 'colonne', gruppo: 'a', nome: 'Pagina a colonne', foto: 'meglio', ricetta: 'watercolor-editorial-01', registri: ['editoriale', 'lusso', 'artigianale'], idea: 'pagina di rivista: occhiello, titolo, capolettera, testo in due o tre colonne, foto stretta verticale, folio e numero di pagina' },
  { id: 'centrato', gruppo: 'a', nome: 'Locandina centrata', foto: 'meglio', ricetta: 'artnouveau-01', registri: ['lusso', 'artigianale', 'retro', 'editoriale'], idea: 'locandina teatrale simmetrica: righe centrate di corpi molto diversi, filetti e fregi sottili, cornice, foto ovale o ad arco' },
  { id: 'verticale', gruppo: 'a', nome: 'Titolo in piedi', foto: 'serve', ricetta: 'fashion-yb-01', registri: ['lusso', 'editoriale', 'notte', 'avanguardia'], idea: 'titolo ruotato di 90 gradi a tutta altezza lungo un lato, foto alta e stretta, informazioni minime in orizzontale' },
  { id: 'iniziale', gruppo: 'a', nome: 'Lettera gigante', foto: 'meglio', ricetta: 'typoalchemy-01', registri: ['editoriale', 'svizzero', 'pop', 'avanguardia'], idea: 'l\'iniziale del titolo enorme come forma che occupa metà tavola, piena, a contorno o con la foto dentro; titolo intero accanto in piccolo' },
  { id: 'calligrafico', gruppo: 'a', nome: 'Pagina calligrafica', foto: 'meglio', ricetta: 'mincho-handwritten-01', registri: ['artigianale', 'lusso', 'editoriale'], idea: 'tanto vuoto, titolo serif sottile in colonna verticale o a capo spezzato, segni a pennello, un timbro rosso, foto piccola' },

  /* ── B · collage e materia ── */
  { id: 'collage', gruppo: 'b', nome: 'Collage strappato', foto: 'serve', ricetta: 'magazine-cutout-01', registri: ['avanguardia', 'pop', 'editoriale', 'notte'], idea: 'la foto ritagliata in frammenti dai bordi strappati, ruotati e sovrapposti, nastro adesivo, segni di taglio, titolo in box appoggiati storti' },
  { id: 'polaroid', gruppo: 'b', nome: 'Polaroid', foto: 'serve', ricetta: 'street-pink-01', registri: ['artigianale', 'retro', 'infantile', 'pop'], idea: 'foto in cornice bianca da istantanea, ruotata, fissata con nastro, scritta a mano sotto, fondo di carta, scarabocchi' },
  { id: 'zine', gruppo: 'b', nome: 'Zine a ritagli', foto: 'meglio', ricetta: 'digital-brutalism-01', registri: ['avanguardia', 'notte', 'pop'], idea: 'titolo a lettere ritagliate come un biglietto anonimo (ogni parola in un box di colore e carattere diverso, ruotato), foto fotocopiata, graffette' },
  { id: 'mosaico', gruppo: 'b', nome: 'Mosaico pop', foto: 'serve', ricetta: 'pop-art-01', registri: ['pop', 'notte', 'avanguardia'], idea: 'la stessa foto ripetuta in una griglia di tessere, ognuna con un trattamento e un colore diverso, titolo su una fascia che attraversa' },
  { id: 'acquerello', gruppo: 'b', nome: 'Acquerello', foto: 'meglio', ricetta: 'watercolor-editorial-01', registri: ['artigianale', 'lusso', 'infantile', 'editoriale'], idea: 'macchie morbide di colore che si sovrappongono in trasparenza, bordi irregolari, serif elegante, foto sfumata in una macchia' },
  { id: 'biglietto', gruppo: 'b', nome: 'Biglietto', foto: 'meglio', ricetta: 'sports-energy-01', registri: ['notte', 'retro', 'sportivo', 'pop'], idea: 'un biglietto d\'ingresso con talloncino perforato, numero di serie, data e prezzo in caselle, foto nel corpo del biglietto, fondo con trama' },
  { id: 'etichetta', gruppo: 'b', nome: 'Etichetta', foto: 'meglio', ricetta: 'pixel-retro-01', registri: ['retro', 'artigianale', 'lusso'], idea: 'un\'etichetta o un sigillo grande al centro: bordo dentellato o a nastro, testo che gira, raggi o fregi, titolo in un cartiglio' },
  { id: 'fumetto', gruppo: 'b', nome: 'Fumetto', foto: 'meglio', ricetta: 'fumetto-01', registri: ['pop', 'infantile', 'sportivo'], idea: 'vignette dai bordi neri spessi, una con la foto retinata, il titolo in un balloon o in una didascalia gialla, onomatopea' },

  /* ── C · geometria e forma ── */
  { id: 'bauhaus', gruppo: 'c', nome: 'Bauhaus', foto: 'meglio', ricetta: 'constructivism-01', registri: ['svizzero', 'avanguardia', 'infantile', 'tech'], idea: 'cerchio, quadrato e triangolo nei colori primari incastrati su griglia, il titolo che segue la geometria, foto dentro una forma' },
  { id: 'memphis', gruppo: 'c', nome: 'Memphis', foto: 'meglio', ricetta: 'memphis-80s-01', registri: ['pop', 'infantile', 'retro'], idea: 'pattern che si scontrano (zigzag, puntini, righe, ghirigori) in forme sparse pastello e acide, titolo in un blocco pieno, foto in un ritaglio geometrico' },
  { id: 'bersaglio', gruppo: 'c', nome: 'Bersaglio', foto: 'meglio', ricetta: 'pop-art-01', registri: ['pop', 'sportivo', 'retro', 'notte'], idea: 'cerchi concentrici a tutta tavola in colori alternati, il titolo al centro o lungo un anello, foto nel centro' },
  { id: 'bande', gruppo: 'c', nome: 'Bande', foto: 'meglio', ricetta: 'sports-energy-01', registri: ['sportivo', 'retro', 'pop', 'notte'], idea: 'bande di colore pieno orizzontali o inclinate come una bandiera o una maglia, il titolo attraversa le bande, numero grande' },
  { id: 'arco', gruppo: 'c', nome: 'Finestra ad arco', foto: 'serve', ricetta: 'luxury-01', registri: ['lusso', 'artigianale', 'editoriale'], idea: 'la foto vista da una finestra ad arco o da una nicchia, simmetria, cornice sottile doppia, titolo sotto con spaziatura ampia' },
  { id: 'deformato', gruppo: 'c', nome: 'Forme deformate', foto: 'meglio', ricetta: 'deformed-flat-01', registri: ['pop', 'infantile', 'tech'], idea: 'forme piatte morbide e stirate che si appoggiano l\'una sull\'altra, colori pieni senza contorno, titolo grasso che si deforma con le forme' },
  { id: 'onde', gruppo: 'c', nome: 'Op-art', foto: 'meglio', ricetta: 'acidgraphics-01', registri: ['avanguardia', 'notte', 'tech', 'retro'], idea: 'linee parallele generate che ondeggiano e si deformano attorno al titolo come un campo di forza, bianco e nero o due colori' },
  { id: 'piramide', gruppo: 'c', nome: 'Piramide', foto: 'meglio', ricetta: 'constructivism-01', registri: ['avanguardia', 'svizzero', 'sportivo'], idea: 'composizione a cuneo: blocchi e parole che crescono di scala lungo una diagonale forte, foto in un triangolo, filetti obliqui' },

  /* ── D · digitale e notte ── */
  { id: 'interfaccia', gruppo: 'd', nome: 'Finestra di sistema', foto: 'meglio', ricetta: 'vaporwave-01', registri: ['tech', 'retro', 'pop'], idea: 'finestre di un vecchio sistema operativo sovrapposte con barra del titolo e pulsanti, la foto in una finestra, cursore, icone' },
  { id: 'sorveglianza', gruppo: 'd', nome: 'Sorveglianza', foto: 'serve', ricetta: 'surveillance-01', registri: ['notte', 'tech', 'avanguardia'], idea: 'foto in bianco e nero con mirino e riquadri di rilevamento, coordinate, ora e data in mono, righe di scansione, etichette REC' },
  { id: 'terminale', gruppo: 'd', nome: 'Terminale', foto: 'meglio', ricetta: 'tech-mono-01', registri: ['tech', 'svizzero', 'notte'], idea: 'tutto in mono su griglia di caratteri: righe numerate, dati allineati, il titolo come comando, barre di avanzamento, foto in pixel' },
  { id: 'brutale', gruppo: 'd', nome: 'Brutalista', foto: 'meglio', ricetta: 'digital-brutalism-01', registri: ['avanguardia', 'notte', 'tech'], idea: 'blocchi neri grezzi, testo enorme che esce dai bordi, link sottolineati, bordi da pagina web senza stile, colore d\'allarme' },
  { id: 'acido', gruppo: 'd', nome: 'Acid', foto: 'meglio', ricetta: 'acidgraphics-01', registri: ['notte', 'avanguardia', 'pop'], idea: 'forme liquide e cromate, stelle a quattro punte, glifi Y2K, testo stirato e a contorno, griglia prospettica' },
  { id: 'aero', gruppo: 'd', nome: 'Aero', foto: 'meglio', ricetta: 'frutiger-aero-01', registri: ['tech', 'pop', 'infantile'], idea: 'bolle lucide e riflessi, gradienti di cielo e acqua, pannelli di vetro arrotondati, sans pulito, ottimismo luminoso' },
  { id: 'pixel', gruppo: 'd', nome: 'Pixel', foto: 'meglio', ricetta: 'pixel-retro-01', registri: ['retro', 'tech', 'infantile', 'pop'], idea: 'griglia di pixel visibile, titolo costruito a blocchi, foto ridotta a pixel grandi, cornice da videogioco, punteggio e vite' },
  { id: 'manga', gruppo: 'd', nome: 'Manga', foto: 'meglio', ricetta: 'manga-01', registri: ['pop', 'sportivo', 'notte', 'infantile'], idea: 'linee di velocità radiali dal soggetto, retino a punti, onomatopea enorme inclinata, vignetta diagonale, titolo in verticale' },
  { id: 'agenzia', gruppo: 'd', nome: 'Studio', foto: 'meglio', ricetta: 'agency-black-orange-01', registri: ['tech', 'svizzero', 'notte', 'editoriale'], idea: 'nero e un colore acceso, numeri e indici grandi, griglia da sito di studio, didascalie tecniche, foto rettangolare con etichetta' },
] as const satisfies readonly ArchetipoInfo[]

export type ArchetipoId = (typeof ARCHETIPI)[number]['id']
