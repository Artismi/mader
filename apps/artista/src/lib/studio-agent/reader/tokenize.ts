/** Parole e frasi dell'italiano, senza modelli. */

export const STOP = new Set(`
a ad al allo ai agli all agl alla alle con col coi da dal dallo dai dagli dall dagl dalla dalle di del dello dei degli dell degl della delle in nel nello nei negli nell negl nella nelle su sul sullo sui sugli sull sugl sulla sulle per tra fra
il lo la i gli le l un uno una un'
e ed o od ma però anche né neanche nemmeno se che chi cui non più meno molto poco tanto tutto tutti tutte ogni come quando dove perché mentre quindi dunque cioè ovvero oppure allora poi già ancora sempre mai solo
io tu lui lei noi voi loro mi ti si ci vi ne me te se sé lo la li gli le suo sua suoi sue mio mia miei mie tuo tua nostro nostra vostro loro questo questa questi queste quello quella quelli quelle stesso stessa altro altra altri altre
essere è sono era erano sia siano fu stato stata stati state sarà saranno avere ha hanno aveva avevano abbia ho hai abbiamo avete fare fa fanno fatto può possono deve devono viene vengono essere
uno due tre anno anni così qui qua lì là via circa dopo prima secondo verso sotto sopra dentro fuori senza contro oltre durante attraverso
`.split(/\s+/).filter(Boolean))

export function words(text: string): string[] {
  return text.toLowerCase()
    .replace(/[’']/g, ' ')
    .split(/[^a-zàèéìíòóùúäëïöüç]+/i)
    .filter(w => w.length > 1)
}

/** parole di contenuto: italiane (solo lettere, finale vocalico), niente codice né inglese */
export const looksItalian = (w: string) => /^[a-zàèéìíòóùú]+$/.test(w) && /[aeiouàèéìíòóùú]$/.test(w) && !/(k|w|y|x|j)/.test(w)
export const content = (ws: string[]) => ws.filter(w => !STOP.has(w) && w.length > 2 && looksItalian(w))

export function sentences(text: string): string[] {
  return text.replace(/\s+/g, ' ')
    .split(/(?<=[.!?;:])\s+(?=[A-ZÀÈÉÌÒÙ"«(])/)
    .map(s => s.trim())
    .filter(s => s.length > 12 && s.length < 400)
    // niente righe di codice, tabelle, formule, elenchi di numeri
    .filter(s => !/[{}\[\]<>|=_#`$\\]/.test(s) && (s.match(/\d/g)?.length ?? 0) < s.length * 0.08)
}

/** termini salienti di un testo rispetto a un corpus (tf-idf grezzo) */
export function salient(text: string, docFreq: (w: string) => number, nDocs: number, k = 12): string[] {
  const tf = new Map<string, number>()
  for (const w of content(words(text))) tf.set(w, (tf.get(w) ?? 0) + 1)
  return [...tf.entries()]
    .map(([w, f]) => [w, f * Math.log((nDocs + 1) / (docFreq(w) + 1))] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w)
}
