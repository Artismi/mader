/**
 * Lettura del testo di una grafica con un modello con visione (solo lato
 * server: qui passano le chiavi). Domande chiuse e uscita JSON validata da
 * zod; le misure fini (carattere, corpo, spaziatura) non si chiedono al
 * modello: le trova il render-and-compare nella pagina.
 */
import { generateObject, generateText, type LanguageModel } from 'ai'
import { letturaSchema, type Lettura } from './tipi'

const SYSTEM = `Leggi il testo di una grafica (manifesto, post, copertina) per ricostruirla in un programma di impaginazione.
Regole:
- Solo testo orizzontale e leggibile. Ignora scritte ruotate, su un cerchio, dentro loghi o fotografie, e lettere singole decorative.
- Un blocco = righe vicine della stessa famiglia di carattere e dello stesso corpo (un titolo su tre righe è un blocco anche se una riga è in corsivo o una parola ha un altro colore; titolo e sottotitolo sono due blocchi).
- Trascrivi ogni riga esattamente: maiuscole, accenti, apostrofi tipografici, punteggiatura. Non correggere, non tradurre, non unire le righe.
- I riquadri sono stretti attorno alle lettere della riga, in millesimi della tavola: [alto, sinistra, basso, destra].
- Per carattere, peso, corsivo, allineamento e ruolo scegli solo tra le voci proposte.`

const PROMPT = 'Elenca i blocchi di testo di questa grafica, dall\'alto in basso.'

const parti = (png: string) => {
  const b64 = png.replace(/^data:image\/\w+;base64,/, '')
  return [{ type: 'text' as const, text: PROMPT }, { type: 'image' as const, image: b64, mediaType: 'image/png' }]
}

/** Ripiego per i modelli che non reggono l'uscita strutturata: JSON nel testo, validato allo stesso modo. */
async function viaTesto(model: LanguageModel, png: string): Promise<Lettura> {
  const { text } = await generateText({
    model, system: SYSTEM, maxRetries: 0,
    messages: [{ role: 'user', content: [...parti(png), { type: 'text', text: 'Rispondi SOLO con un oggetto JSON {"blocchi":[{"righe":[{"testo","box"}],"famiglia","peso","corsivo","allineamento","ruolo"}]}.' }] }],
  })
  return letturaSchema.parse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)))
}

/** Legge i blocchi di testo di un'immagine PNG (data URL o base64). */
export async function leggiTesto(model: LanguageModel, png: string): Promise<Lettura> {
  try {
    const { object } = await generateObject({ model, system: SYSTEM, schema: letturaSchema, messages: [{ role: 'user', content: parti(png) }], temperature: 0, maxRetries: 0 })
    return object
  } catch {
    return viaTesto(model, png)
  }
}

/** Modelli Gemini in ordine di preferenza: il primo che risponde (gli ID vecchi vengono ritirati). */
export const MODELLI_GEMINI = (process.env.DECOMPILA_MODELLO ?? 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3.1-flash-lite').split(',').map(s => s.trim()).filter(Boolean)

/** Prova i modelli in fila, con un secondo tentativo sugli errori di carico (503). */
export async function leggiConRipiego(modelli: { model: LanguageModel; label: string }[], png: string): Promise<{ lettura: Lettura; label: string }> {
  let ultimo: unknown
  for (const m of modelli) {
    for (let i = 0; i < 2; i++) {
      try { return { lettura: await leggiTesto(m.model, png), label: m.label } } catch (e) {
        ultimo = e
        const msg = String((e as Error)?.message ?? e)
        // quota finita o modello ritirato: subito il prossimo; carico momentaneo: un secondo tentativo
        if (!/503|overload|high demand|UNAVAILABLE/i.test(msg)) break
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
  throw ultimo ?? new Error('nessun modello con visione disponibile')
}
