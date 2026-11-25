/**
 * Caratteri liberi d'avanguardia della fonderia Velvetyne (velvetyne.fr), serviti
 * dall'app (public/fonts/libere). Tutti sotto SIL Open Font License 1.1: la licenza
 * di ciascuno è nella sua cartella. Alcuni stili di una stessa famiglia sono
 * disegni diversi (non pesi) e compaiono come caratteri separati.
 */
import type { FontEntry } from './font-catalog'

const F = (family: string, cat: string, dir: string, files: [string, number, string?][]): FontEntry => ({
  family, cat, source: 'local', weights: files.map(f => f[1]),
  files: files.map(([file, weight, style]) => ({ url: `/fonts/libere/${dir}/${file}`, weight, style: style ?? 'normal' })),
})

export const LOCAL_FONTS: FontEntry[] = [
  F('Basteleur', 'avanguardia', 'basteleur', [['Basteleur-Moonlight.woff2', 400], ['Basteleur-Bold.woff2', 700]]),
  F('Ouroboros', 'avanguardia', 'ouroboros', [['Ouroboros-Regular.woff2', 400]]),
  F('Le Murmure', 'display', 'murmure', [['LeMurmure-Regular.woff2', 400]]),
  F('Mess', 'avanguardia', 'Mess', [['Mess-Light_web.woff2', 400]]),
  F('Trickster', 'avanguardia', 'Trickster', [['Trickster-Regular.woff2', 400]]),
  F('Kaeru Kaeru', 'avanguardia', 'kaerukaeru', [['kaerukaeru-Regular.woff2', 400]]),
  F('Gulax', 'avanguardia', 'Gulax', [['Gulax-Regular.woff2', 400]]),
  F('Mourier', 'avanguardia', 'mourier', [['Mourier-Regular.woff2', 400]]),
  F('Imago Mundi Mei', 'avanguardia', 'imago-mundi-mei', [['ImagoMundiMei-Regular.woff2', 400]]),
  F('Letters Lavish', 'avanguardia', 'letters', [['Letters-Lavish.woff2', 400]]),
  F('Letters Torn', 'avanguardia', 'letters', [['Letters-Torn.woff2', 400]]),
  F('Facade Est', 'avanguardia', 'Facade-font', [['Facade-Est.woff2', 400]]),
  F('Facade Ouest', 'avanguardia', 'Facade-font', [['Facade-Ouest.woff2', 400]]),
  F('Facade Sud-Ouest', 'avanguardia', 'Facade-font', [['Facade-Sud-Ouest.woff2', 400]]),
  F('Anthony', 'display', 'anthony', [['Anthony.woff2', 400]]),
  F('BackOut', 'display', 'backout', [['BackOut.woff2', 400]]),
  F('Lineal', 'display', 'lineal', [['Lineal-Regular.woff2', 400], ['Lineal-Bold.woff2', 700], ['Lineal-Black.woff2', 900]]),
  F('Velvetyne Grotesk', 'grotesk', 'grotesk', [['Grotesk-01Extrafin.woff2', 200], ['Grotesk-02Mince.woff2', 300], ['Grotesk-03Regular.woff2', 400]]),
  F('Sporting Grotesque', 'grotesk', 'Sporting-Grotesque', [['SportingGrotesque-Regular.otf', 400], ['SportingGrotesque-Bold.otf', 700]]),
  F('Happy Times', 'editoriali', 'Happy-Times-at-the-IKOB', [['happy-times-NG_regular_master_web.woff2', 400], ['happy-times-NG_bold_master_web.woff2', 700], ['happy-times-NG_italic_master_web.woff2', 400, 'italic']]),
  F('Cantique', 'editoriali', 'cantique', [['Cantique-Normal.woff2', 400]]),
  F('Feroniapi', 'editoriali', 'feroniapi', [['Feroniapi-MediumItalic.woff2', 500, 'italic']]),
  F('Interlope', 'calligrafici', 'interlope', [['Interlope-Regular.woff2', 400]]),
  F('Flor de Ruina', 'gotici', 'flor-des-ruina', [['FlorDeRuina-Flor.woff2', 400]]),
  F('Flor de Ruina Fractura', 'gotici', 'flor-des-ruina', [['FlorDeRuina-Fractura.woff2', 400]]),
  F('Flor de Ruina Germen', 'gotici', 'flor-des-ruina', [['FlorDeRuina-Germen.woff2', 400]]),
  F('Sligoil', 'mono', 'sligoil', [['Sligoil-Micro.woff2', 400], ['Sligoil-MicroMedium.woff2', 500], ['Sligoil-MicroBold.woff2', 700]]),
  F('Compagnon', 'mono', 'compagnon', [['Compagnon-Light.woff2', 300], ['Compagnon-Medium.woff2', 500], ['Compagnon-Bold.woff2', 700]]),
  F('Format 1452', 'stencil', 'format-1452', [['Format_1452.woff2', 400]]),
  F('VG5000', 'pixel', 'vg5000', [['VG5000-Regular_web.woff2', 400]]),
  F('Jgs 5', 'pixel', 'jgs', [['jgs5.woff2', 400]]),
  F('Jgs 9', 'pixel', 'jgs', [['jgs9.woff2', 400]]),
]
